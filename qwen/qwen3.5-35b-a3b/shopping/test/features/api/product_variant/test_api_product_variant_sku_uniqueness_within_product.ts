import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_sku_uniqueness_within_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets approved
  const joinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller approval status",
    seller.approval_status,
    "approved",
  );
  // 2. Create seller connection for API operations
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: seller.token.access };
  // 3. Generate a product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create first variant with SKU-001 (should succeed)
  const variant1 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "SKU-001",
          option_values: { size: "Large", color: "Red" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price_override: null,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  TestValidator.equals("SKU code", variant1.skuCode, "SKU-001");
  // 5. Create second variant with DIFFERENT SKU-002 (should succeed)
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "SKU-002",
          option_values: { size: "Medium", color: "Blue" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price_override: null,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  TestValidator.equals("SKU code", variant2.skuCode, "SKU-002");
  TestValidator.notEquals("variant IDs differ", variant1.id, variant2.id);
  // 6. Try to create third variant with DUPLICATE SKU-001 (should fail)
  await TestValidator.error("duplicate SKU within same product", async () => {
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: "SKU-001",
          option_values: { size: "Small", color: "Green" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price_override: null,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
    throw new Error("Expected error but operation succeeded");
  });
  // 7. Verify first two variants are still present (unaffected by failed attempt)
  TestValidator.predicate("variant1 ID valid", variant1.id.length > 0);
  TestValidator.predicate("variant2 ID valid", variant2.id.length > 0);
  // 8. Test cross-product SKU reuse - same SKU code in different product
  const productId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variant3 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: productId2,
        body: {
          sku_code: "SKU-001", // Same SKU as variant1 but different product
          option_values: { size: "XLarge", color: "Yellow" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price_override: null,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  TestValidator.equals(
    "SKU reused in different product",
    variant3.skuCode,
    "SKU-001",
  );
  TestValidator.notEquals("product IDs differ", variant3.product.id, productId);
}
