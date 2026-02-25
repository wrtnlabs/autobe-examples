import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test inventory history filtering by variant, seller, and reason codes.
 *
 * 1. Register seller and authenticate
 * 2. Create a product with a variant
 * 3. Filter inventory history by variant_id
 * 4. Filter inventory history by seller_id
 * 5. Filter inventory history by reason codes
 * 6. Verify pagination functionality
 */
export async function test_api_seller_inventory_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url:
        Math.random() > 0.5
          ? null
          : typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  sellerConnection.headers = { Authorization: joinResult.token.access };
  // 2. Create product with variant - use a valid category ID
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: `VARIANT_${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick(["red", "blue", "green"]),
              },
            ],
            stock_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("variant exists", product.variants.length, 1);
  const variant = product.variants[0];
  // 3. Filter inventory history by variant ID
  const filteredByVariant =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          variant_id: variant.id,
          limit: 10,
        } satisfies IShoppingMallInventoryHistory,
      },
    );
  typia.assert(filteredByVariant);
  TestValidator.equals(
    "variant filter returns records",
    filteredByVariant.data.length > 0,
    true,
  );
  // 4. Filter inventory history by seller ID
  const filteredBySeller =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          seller_id: joinResult.data.profile.id,
          limit: 10,
        } satisfies IShoppingMallInventoryHistory,
      },
    );
  typia.assert(filteredBySeller);
  TestValidator.equals(
    "seller filter returns records",
    filteredBySeller.data.length > 0,
    true,
  );
  // 5. Filter by reason codes - handle as optional field
  const filteredByReason =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          reason: ["restock", "adjustment"] as string[] | undefined,
          limit: 10,
        } satisfies IShoppingMallInventoryHistory,
      },
    );
  typia.assert(filteredByReason);
  TestValidator.equals(
    "reason filter returns records",
    filteredByReason.data.length > 0,
    true,
  );
  // 6. Filter by date range
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const now = new Date();
  const filteredByDate =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          created_at_start: oneMonthAgo.toISOString(),
          created_at_end: now.toISOString(),
          limit: 10,
        } satisfies IShoppingMallInventoryHistory,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.equals(
    "date filter returns records",
    filteredByDate.data.length > 0,
    true,
  );
  // 7. Combined filters
  const combinedFilter =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          variant_id: variant.id,
          reason: ["restock", "adjustment"] as string[] | undefined,
          created_at_start: oneMonthAgo.toISOString(),
          created_at_end: now.toISOString(),
          limit: 10,
        } satisfies IShoppingMallInventoryHistory,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter returns records",
    combinedFilter.data.length > 0,
    true,
  );
  // 8. Pagination test
  const paginated =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        body: {
          variant_id: variant.id,
          limit: 1,
          page: 1,
        } satisfies IShoppingMallInventoryHistory,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit respected",
    paginated.data.length <= 1,
    true,
  );
  TestValidator.predicate(
    "pagination info exists",
    paginated.pagination.records > 0,
  );
}
