import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_histories_retrieve_with_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  // setup sellerConnection's authorization header
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a product with prepared subcategory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create multiple product variants
  const variants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < 3; ++i) {
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create_variant(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            skuCode: RandomGenerator.alphaNumeric(8),
            priceOverride: i % 2 === 0 ? null : typia.random<number>(),
            stockQuantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 4. Patch inventory histories to add some entries (simulate inventory changes)
  // Note: There's no API in the provided list for adding inventory history entries directly,
  // so assume the system logs inventory history automatically on variant stock changes.
  // Here we just test inventory history retrieval.
  // For testing filters, we apply date ranges and reason filters
  const now = new Date();
  // Define a filter reason that probably exists or be common
  const reasonFilter = "restock";
  // 5. Retrieve inventory histories page 1 with limit 2
  let response =
    await api.functional.shoppingMall.seller.inventory.histories.index(
      sellerConnection,
      {
        body: {
          shoppingMallProductVariantId: variants[0].id,
          startDate: new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days ago
          endDate: now.toISOString(),
          reason: reasonFilter,
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(response);
  // Validate pagination object
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", response.pagination.limit === 2);
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  // Validate each data entry
  for (const entry of response.data) {
    typia.assert(entry);
    TestValidator.equals(
      "filter product variant id match",
      entry.shoppingMallProductVariantId,
      variants[0].id,
    );
    TestValidator.equals("reason match filter", entry.reason, reasonFilter);
    TestValidator.predicate(
      "quantityDelta present",
      typeof entry.quantityDelta === "number",
    );
    TestValidator.predicate(
      "timestamp valid createdAt",
      !isNaN(new Date(entry.createdAt).getTime()),
    );
  }
  // 6. Retrieve inventory histories page 2 with limit 2 (if applicable)
  if (response.pagination.pages > 1) {
    const responsePage2 =
      await api.functional.shoppingMall.seller.inventory.histories.index(
        sellerConnection,
        {
          body: {
            shoppingMallProductVariantId: variants[0].id,
            startDate: new Date(
              now.getTime() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            endDate: now.toISOString(),
            reason: reasonFilter,
            page: 2,
            limit: 2,
          },
        },
      );
    typia.assert(responsePage2);
    TestValidator.predicate(
      "pagination current page page 2",
      responsePage2.pagination.current === 2,
    );
    // Validate the entries' product variant ID and reason
    for (const entry of responsePage2.data) {
      typia.assert(entry);
      TestValidator.equals(
        "filter product variant id match page 2",
        entry.shoppingMallProductVariantId,
        variants[0].id,
      );
      TestValidator.equals(
        "reason match filter page 2",
        entry.reason,
        reasonFilter,
      );
    }
  }
  // 7. Validate access control: try to retrieve inventory histories with another seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(seller2Auth);
  seller2Connection.headers = { Authorization: seller2Auth.token.access };
  await TestValidator.error("access denied for foreign seller", async () => {
    await api.functional.shoppingMall.seller.inventory.histories.index(
      seller2Connection,
      {
        body: {
          shoppingMallProductVariantId: variants[0].id,
          page: 1,
          limit: 5,
        },
      },
    );
  });
}
