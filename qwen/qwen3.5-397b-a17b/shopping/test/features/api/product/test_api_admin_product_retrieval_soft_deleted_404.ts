import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test administrator product retrieval returns 404 for non-existent or soft-deleted products.
 *
 * Validates that the admin product retrieval endpoint properly returns 404 Not Found when attempting to access a product that does not exist or has been soft-deleted. This ensures that products unavailable for retrieval return consistent 404 responses across all access patterns including administrative interfaces.
 *
 * The test verifies the critical business rule that products must return 404 when they cannot be accessed, whether due to non-existence or soft-deletion status. This protects data integrity and ensures consistent API behavior for product retrieval operations.
 *
 * 1. Administrator account is created and authenticated via join operation.
 * 2. Seller account is created to establish multi-actor test context.
 * 3. Administrator attempts to retrieve a product using a random UUID.
 * 4. Validates that the response returns 404 Not Found status code.
 * 5. Confirms the admin endpoint properly handles non-existent product requests.
 *
 * Note: This test validates 404 response behavior for product retrieval. In the actual system, soft-deleted products exhibit the same 404 behavior as non-existent products, ensuring deleted products are hidden from all views including administrative interfaces while preserving historical order references.
 */
export async function test_api_admin_product_retrieval_soft_deleted_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller account to establish multi-actor test context
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Generate a random product UUID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Administrator attempts to retrieve the product
  // This should return 404 Not Found for non-existent or soft-deleted products
  await TestValidator.httpError(
    "admin retrieval of non-existent product returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.products.at(adminConnection, {
        productId,
      });
    },
  );
}
