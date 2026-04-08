import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller cannot view inventory records for variants owned by other sellers.
 *
 * Validates the authorization mechanism that prevents sellers from accessing inventory movement history belonging to other sellers. This protects competitive business information and ensures data isolation between sellers on the platform.
 *
 * The test creates two independent seller accounts and verifies that when Seller B attempts to access inventory records for a variant owned by Seller A, the request is rejected with an authorization error.
 *
 * 1. Seller A registers and authenticates on the platform.
 * 2. Seller B registers and authenticates on the platform.
 * 3. Seller B attempts to access inventory records using a variant ID that belongs to Seller A.
 * 4. Validates that the request is rejected with appropriate authorization error.
 *
 * **Authorization Logic**:
 * - Inventory records are confidential business data visible only to the variant owner.
 * - Cross-seller data access is prohibited to protect competitive information.
 * - Authorization verifies seller owns the product that contains the variant.
 * - System returns 403 Forbidden to prevent information leakage between competing sellers.
 *
 * **Note**: This test validates the authorization rejection mechanism. The variant ID represents a variant owned by Seller A in the authorization context.
 */
export async function test_api_inventory_record_seller_access_denied_other_seller_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A registers and authenticates
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller B registers and authenticates (separate account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Generate a variant ID that represents a variant owned by Seller A
  // In production, this variant would be created by Seller A through product/variant creation APIs
  const sellerAVariantId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller B attempts to access Seller A's variant inventory records
  // This should be rejected with authorization error (403 Forbidden)
  // The authorization system should prevent cross-seller data access
  await TestValidator.error(
    "Seller B cannot access Seller A's variant inventory records",
    async () => {
      await api.functional.shoppingMall.seller.variants.inventory_records.index(
        sellerBConnection,
        {
          variantId: sellerAVariantId,
          body: {
            take: 10,
            skip: 0,
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    },
  );
}
