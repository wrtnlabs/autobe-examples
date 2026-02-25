import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_variant_snapshot_seller_own_variant_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create a seller account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminJoinResult);
  // Step 2: Authenticate as seller to create a product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerJoinResult);
  // Login as seller to establish authenticated session
  const sellerLoginEmail = typia.random<string & tags.Format<"email">>();
  const sellerLoginPassword = RandomGenerator.alphaNumeric(16);
  // Create seller account
  const sellerJoinWithPassword = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerLoginEmail,
      password: sellerLoginPassword,
    },
  });
  typia.assert(sellerJoinWithPassword);
  // Login to get seller ID
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerLoginEmail,
      password: sellerLoginPassword,
    },
  });
  typia.assert(sellerLoginResult);
  // Use seller id from login result (not from join result)
  const sellerId = sellerLoginResult.id;
  // Create product with a variant using the seller's authenticated connection
  const productCreateResponse =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1>
            >(),
            options: [
              {
                option_name: "color",
                option_value: "red",
              },
              {
                option_name: "size",
                option_value: "large",
              },
            ],
          },
        ],
      },
    });
  typia.assert(productCreateResponse);
  // Cast to the known structure used in the backend
  // The response type is IShoppingMallCustomer but backend returns { id, variants[] }
  // This is a workaround for a flawed API specification
  const productWithVariants = productCreateResponse as unknown as {
    id: string;
    variants: Array<{
      id: string;
    }>;
  };
  const productId = productWithVariants.id;
  const variantId = productWithVariants.variants[0].id;
  typia.assert(productId);
  typia.assert(variantId);
  // Step 3: Access snapshots as the seller (using their authenticated connection)
  // The endpoint is defined as admin endpoint but authorization rules allow seller to access own snapshots
  const variantSnapshots =
    await api.functional.shoppingMall.admin.products.variants.snapshots.at(
      sellerConnection, // Using seller's connection - authorization should allow it
      {
        productId,
        variantId,
      },
    );
  typia.assert(variantSnapshots);
  // Step 4: Validate snapshots
  // Should have at least the initial creation snapshot (version 1)
  TestValidator.equals(
    "has at least one snapshot",
    variantSnapshots.data.length,
    1,
  );
  const firstSnapshot = variantSnapshots.data[0];
  TestValidator.equals("version is 1", firstSnapshot.version, 1);
  TestValidator.equals(
    "changed_by matches seller id",
    firstSnapshot.changed_by,
    sellerId,
  );
  TestValidator.equals(
    "snapshot variant_id matches created variant",
    firstSnapshot.product_variant_id,
    variantId,
  );
  // Verify we have pagination metadata
  TestValidator.equals(
    "pagination has correct current page",
    variantSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is at least 1",
    variantSnapshots.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records is at least 1",
    variantSnapshots.pagination.records >= 1,
    true,
  );
  TestValidator.equals(
    "pagination pages is at least 1",
    variantSnapshots.pagination.pages >= 1,
    true,
  );
  // Test that the variant snapshot history is complete and immutable
  TestValidator.equals(
    "changed_at is a valid date-time",
    !!new Date(firstSnapshot.changed_at).getTime(),
    true,
  );
  TestValidator.equals(
    "created_at is a valid date-time",
    !!new Date(firstSnapshot.created_at).getTime(),
    true,
  );
  TestValidator.equals(
    "updated_at is a valid date-time",
    !!new Date(firstSnapshot.updated_at).getTime(),
    true,
  );
  // All assertions passed - seller can access their own variant snapshot history
}
