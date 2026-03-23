import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_inventory_history_retrieval(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Create product with variant
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<number & tags.Type<"uint32">>() satisfies number as number,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            price_override: null,
          },
        ] satisfies IEcommerceMallProductVariant.ICreate[],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Ensure we have a variant
  if (!product.variants || product.variants.length === 0) {
    throw new Error("Product must have at least one variant");
  }
  const variant = product.variants[0];
  // 3. Get inventory history with default pagination
  const history =
    await api.functional.ecommerceMall.seller.sellers.products.variants.inventory_history.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(history);
  // 4. Validate response structure
  TestValidator.predicate(
    "has pagination info",
    history.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(history.data));
  TestValidator.predicate(
    "data is array of inventory records",
    history.data.every((record) => record !== undefined),
  );
  // Validate pagination fields
  TestValidator.predicate("current page >= 1", history.pagination.current >= 1);
  TestValidator.predicate("limit > 0", history.pagination.limit > 0);
  TestValidator.predicate("records >= 0", history.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", history.pagination.pages >= 0);
  // Validate inventory records structure if records exist
  if (history.data.length > 0) {
    history.data.forEach((record) => {
      typia.assert(record);
      TestValidator.predicate("has id", record.id !== undefined);
      TestValidator.predicate(
        "has variant_id",
        record.variant_id !== undefined,
      );
      TestValidator.predicate(
        "has quantity_change",
        typeof record.quantity_change === "number",
      );
      TestValidator.predicate("has reason", typeof record.reason === "string");
      TestValidator.predicate(
        "has created_at",
        record.created_at !== undefined,
      );
      TestValidator.predicate("has variant info", record.variant !== undefined);
    });
  }
}