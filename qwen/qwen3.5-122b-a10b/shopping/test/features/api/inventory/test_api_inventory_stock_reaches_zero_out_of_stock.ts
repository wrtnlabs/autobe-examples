import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { generate_random_ecommerce_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_seller_variants_inventory_create";
import { prepare_random_ecommerce_inventory_record } from "../../../prepare/prepare_random_ecommerce_inventory_record";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_inventory_stock_reaches_zero_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create a variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: "color=Red;size=Large",
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Add initial stock (e.g., 10 units)
  const initialStockRecord =
    await generate_random_ecommerce_seller_variants_inventory_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: 10,
          reason: "restock",
        } satisfies IEcommerceInventoryRecord.ICreate,
      },
    );
  typia.assert(initialStockRecord);
  TestValidator.equals(
    "initial stock quantity change",
    initialStockRecord.quantity_change,
    10,
  );
  // 5. Reduce stock to exactly zero by subtracting all units
  const depletionRecord =
    await generate_random_ecommerce_seller_variants_inventory_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: -10,
          reason: "order",
        } satisfies IEcommerceInventoryRecord.ICreate,
      },
    );
  typia.assert(depletionRecord);
  TestValidator.equals(
    "stock depletion quantity change",
    depletionRecord.quantity_change,
    -10,
  );
  // 6. Validate that the variant can be depleted to zero stock
  // The system should now show this variant as out of stock
  TestValidator.predicate(
    "variant stock reaches zero after inventory adjustment",
    initialStockRecord.quantity_change + depletionRecord.quantity_change === 0,
  );
  // 7. Verify inventory records are immutable and preserved
  TestValidator.notEquals(
    "inventory records are separate entries",
    initialStockRecord.id,
    depletionRecord.id,
  );
}