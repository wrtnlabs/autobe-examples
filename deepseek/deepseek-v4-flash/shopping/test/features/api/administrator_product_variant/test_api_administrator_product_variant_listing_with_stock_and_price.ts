import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_administrator_product_variant_listing_with_stock_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with a known base_price
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 19.99,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant A with price override (29.99)
  const variantWithPrice =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-PRICE-OVERRIDE-001",
          price: 29.99,
          options: [{ key: "size", value: "Large" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variantWithPrice);
  // 5. Seller creates variant B without price override (inherits base_price)
  const variantWithoutPrice =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-NO-PRICE-OVERRIDE-001",
          price: null,
          options: [{ key: "size", value: "Small" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variantWithoutPrice);
  // 6. Add inventory (100 units) to variant A only
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_change: 100,
        reason: "Initial restock for E2E testing",
      },
      params: {
        productId: product.id,
        variantId: variantWithPrice.id,
      },
    },
  );
  // 7. Call the administrator variant listing endpoint
  const page =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(page);
  // 8. Validate pagination metadata
  TestValidator.equals("pagination records", page.pagination.records, 2);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.predicate("pagination limit > 0", page.pagination.limit > 0);
  // 9. Validate variant data - find variants by sku_code
  const variantA = page.data.find(
    (v) => v.sku_code === "SKU-PRICE-OVERRIDE-001",
  );
  const variantB = page.data.find(
    (v) => v.sku_code === "SKU-NO-PRICE-OVERRIDE-001",
  );
  TestValidator.predicate(
    "variant A (with price override) found",
    variantA !== undefined,
  );
  TestValidator.predicate(
    "variant B (without price override) found",
    variantB !== undefined,
  );
  // Validate variant IDs match the created variants
  TestValidator.equals(
    "variant A id matches created variant",
    variantA!.id,
    variantWithPrice.id,
  );
  TestValidator.equals(
    "variant B id matches created variant",
    variantB!.id,
    variantWithoutPrice.id,
  );
  // Validate stock: variant A has inventory, variant B has none
  TestValidator.equals("variant A stock", variantA!.stock, 100);
  TestValidator.equals("variant B stock", variantB!.stock, 0);
  // Validate effective_price: variant A uses its override, variant B inherits base_price
  TestValidator.equals(
    "variant A effective_price (price override)",
    variantA!.effective_price,
    29.99,
  );
  TestValidator.equals(
    "variant B effective_price (inherits base_price)",
    variantB!.effective_price,
    19.99,
  );
}
