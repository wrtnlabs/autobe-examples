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

export async function test_api_inventory_restock_positive_quantity(
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
    {},
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: "color=Red;size=Medium",
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Store initial stock quantity
  const initialStock = variant.stock_quantity;
  // 4. Create inventory record with positive quantity change
  const restockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const inventoryRecord =
    await generate_random_ecommerce_seller_variants_inventory_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: restockQuantity,
          reason: "restock",
        } satisfies IEcommerceInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Validate inventory record properties
  TestValidator.equals(
    "quantity change is positive",
    inventoryRecord.quantity_change,
    restockQuantity,
  );
  TestValidator.predicate(
    "reason is provided",
    inventoryRecord.reason.length > 0,
  );
  TestValidator.equals(
    "variant matches",
    inventoryRecord.product_variant.id,
    variant.id,
  );
  // 6. Validate stock quantity increased by restock amount through variant summary in inventory record
  TestValidator.equals(
    "stock increased correctly",
    inventoryRecord.product_variant.stock_count,
    initialStock + restockQuantity,
  );
}
