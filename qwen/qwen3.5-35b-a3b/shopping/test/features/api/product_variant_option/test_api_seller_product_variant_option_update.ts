import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_variant_option_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Create seller connection with token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuthorized.token.access,
    },
  };
  // 2. Seller creates product
  const randomCategory = typia.random<IEcommerceMallCategory.ISummary>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    authenticatedSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: randomCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates variant with options
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      authenticatedSellerConnection,
      {
        productId: product.id,
        body: {
          sku: RandomGenerator.alphaNumeric(12).toUpperCase(),
          options: {
            size: "Large",
            color: "Red",
          },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity:
            (typia.random<number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>>()),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Verify variant contains at least one option
  const optionsObj = JSON.parse(variant.options);
  TestValidator.equals(
    "variant has options",
    Object.keys(optionsObj).length,
    2,
  );
  // 5. Create mock option for testing update
  // Since there's no option creation API, we generate a random UUID for optionId
  const optionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const originalOptionValue = optionsObj.size;
  const newOptionValue = "Extra Large";
  // 6. Update option with new value
  const updatedOption =
    await api.functional.ecommerceMall.seller.products.variants.options.update(
      authenticatedSellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionId,
        body: {
          value: newOptionValue,
        } satisfies IEcommerceMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedOption);
  // 7. Verify response contains updated option with new value
  TestValidator.equals(
    "option value updated",
    updatedOption.value,
    newOptionValue,
  );
  // 8. Verify updated_at timestamp is present
  TestValidator.predicate(
    "updated_at is present",
    () => updatedOption.updated_at !== undefined,
  );
  // 9. Verify product_variant reference points to correct variant
  TestValidator.equals(
    "product_variant id matches",
    updatedOption.product_variant.id,
    variant.id,
  );
  // 10. Verify product_variant reference includes correct sku
  TestValidator.equals(
    "product_variant sku matches",
    updatedOption.product_variant.sku,
    variant.sku,
  );
  // 11. Verify option key is unchanged
  TestValidator.equals("option key unchanged", updatedOption.key, "size");
  // 12. Verify soft delete status is preserved (not deleted)
  TestValidator.equals("option not deleted", updatedOption.deleted_at, null);
}