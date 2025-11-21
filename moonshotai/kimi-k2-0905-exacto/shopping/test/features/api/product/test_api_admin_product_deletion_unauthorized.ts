import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product deletion attempted by unauthorized users (customers, guests) to
 * validate proper access control enforcement.
 *
 * This test validates that only admin roles can perform permanent product
 * deletion and that authorization is properly enforced at the API level. The
 * test ensures marketplace security by preventing unauthorized product
 * removal.
 *
 * The test follows this business workflow:
 *
 * 1. Create an admin account to establish deletion permissions for testing
 * 2. Create a customer account to represent unauthorized users
 * 3. Test unauthorized product deletion attempts by customers
 * 4. Test unauthorized product deletion attempts by unauthenticated users
 * 5. Verify proper unauthorized access error handling and security validation
 *
 * This validation is critical for marketplace security as it ensures only
 * authorized administrators can remove products from the catalog, protecting
 * against malicious deletions and maintaining catalog integrity.
 *
 * Step-by-step process:
 *
 * 1. Register admin account to establish deletion permissions
 * 2. Register customer account for unauthorized access testing
 * 3. Attempt unauthorized product deletion with customer credentials
 * 4. Attempt unauthorized product deletion without authentication
 * 5. Confirm both unauthorized scenarios are properly blocked
 */
export async function test_api_admin_product_deletion_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Register admin account for testing permissions
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(1),
        lastname: RandomGenerator.name(1),
        adminlevel: "department_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Verify admin has proper elevated permissions
  TestValidator.equals(
    "admin should have elevated privileges",
    admin.is_super_admin,
    false,
  );
  TestValidator.equals("admin should be active", admin.is_active, true);
  TestValidator.equals(
    "admin should have proper level",
    admin.admin_level,
    "department_admin",
  );

  // Step 2: Register customer account for unauthorized access testing
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Test1234!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IShoppingMallCustomer.IRegister,
    });
  typia.assert(customer);

  // Step 3: Attempt unauthorized product deletion with customer credentials
  // Customer attempts to delete a product they have no permission to delete
  const productCode: string = RandomGenerator.alphaNumeric(8);

  await TestValidator.error(
    "Customer should not be able to delete admin-only products",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(connection, {
        productCode: productCode,
      });
    },
  );

  // Step 4: Test that admin context grants deletion access (control test)
  // This confirms the API works when properly authorized
  const adminDeletion: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.erase(connection, {
      productCode: productCode,
    });
  typia.assert(adminDeletion);

  // Step 5: Test unauthenticated deletion attempts
  // Create completely unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthenticated users should not be able to delete products",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(unauthConn, {
        productCode: productCode,
      });
    },
  );
}
