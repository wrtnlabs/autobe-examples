import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_list_active_all(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Verify admin authentication token was set in connection
  // The SDK automatically handles token management - no manual header manipulation

  // Step 3: Perform the seller listing operation with no filters (active sellers only)
  // The API endpoint PATCH /shoppingMall/admin/actors/sellers accepts IRequest
  // with no required fields - leaving empty object will return all active sellers
  const sellerList: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
      body: {} satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sellerList);

  // Step 4: Validate pagination structure
  TestValidator.equals("pagination exists", sellerList.pagination, {
    current: 1,
    limit: 10,
    records: sellerList.data.length,
    pages: Math.ceil(sellerList.data.length / 10),
  });

  // Step 5: Validate that all returned sellers have active status
  TestValidator.predicate(
    "all sellers are active",
    sellerList.data.every((seller) => seller.status === "active"),
  );

  // Step 6: Validate seller data structure
  sellerList.data.forEach((seller) => {
    typia.assert<IShoppingMallSeller>(seller);
    TestValidator.predicate(
      "seller has id",
      typeof seller.id === "string" && seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has email",
      typeof seller.email === "string" && seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has business_name",
      typeof seller.business_name === "string" &&
        seller.business_name.length > 0,
    );
    TestValidator.predicate(
      "seller has business_address",
      typeof seller.business_address === "string" &&
        seller.business_address.length > 0,
    );
    TestValidator.predicate(
      "seller has tax_id",
      typeof seller.tax_id === "string" && seller.tax_id.length > 0,
    );
    TestValidator.predicate(
      "seller has created_at",
      typeof seller.created_at === "string" && seller.created_at.length > 0,
    );
    TestValidator.predicate(
      "seller has updated_at",
      typeof seller.updated_at === "string" && seller.updated_at.length > 0,
    );
    TestValidator.equals("seller status is active", seller.status, "active");
    TestValidator.equals("seller deleted_at is null", seller.deleted_at, null);
  });
}
