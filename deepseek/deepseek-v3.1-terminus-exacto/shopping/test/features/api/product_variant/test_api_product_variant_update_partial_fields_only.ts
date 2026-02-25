import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_variant_update_partial_fields_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product with mock category ID (since we don't have category utility)
  // Using realistic UUID format that would pass validation
  const mockCategoryId =
    "550e8400-e29b-41d4-a716-446655440000" satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">;
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: mockCategoryId,
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with random option values
  const optionValues = {
    color: RandomGenerator.pick(["red", "blue", "green", "black", "white"]),
    size: RandomGenerator.pick(["S", "M", "L", "XL"]),
  };
  const variantBody = {
    sku: RandomGenerator.alphaNumeric(10),
    option_values: JSON.stringify(optionValues),
    price_override: typia.random<number & tags.Minimum<0>>(),
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommerceProductVariant.ICreate;
  const originalVariant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: variantBody,
      },
    );
  typia.assert(originalVariant);
  // 4. Update only the price_override field (partial update)
  const newPrice = typia.random<number & tags.Minimum<0>>();
  const updateBody = {
    price_override: newPrice,
  } satisfies IEcommerceProductVariant.IUpdate;
  const updatedVariant =
    await api.functional.ecommerce.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: originalVariant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate partial update behavior
  TestValidator.equals(
    "variant ID remains the same",
    updatedVariant.id,
    originalVariant.id,
  );
  TestValidator.equals(
    "SKU remains unchanged",
    updatedVariant.sku,
    originalVariant.sku,
  );
  TestValidator.equals(
    "option values remain unchanged",
    updatedVariant.option_values,
    originalVariant.option_values,
  );
  TestValidator.equals(
    "quantity remains unchanged",
    updatedVariant.quantity,
    originalVariant.quantity,
  );
  TestValidator.equals(
    "product association remains unchanged",
    updatedVariant.product.id,
    originalVariant.product.id,
  );
  // Price override should be updated
  TestValidator.equals(
    "price override is updated",
    updatedVariant.price_override,
    newPrice,
  );
  TestValidator.notEquals(
    "price override changed from original",
    updatedVariant.price_override,
    originalVariant.price_override,
  );
  // Timestamps should be updated (created_at remains, updated_at changes)
  TestValidator.equals(
    "created_at remains same",
    updatedVariant.created_at,
    originalVariant.created_at,
  );
  TestValidator.notEquals(
    "updated_at changes after modification",
    updatedVariant.updated_at,
    originalVariant.updated_at,
  );
  // Validate that deleted_at remains null
  TestValidator.equals(
    "deleted_at remains null",
    updatedVariant.deleted_at,
    null,
  );
  // 6. Test edge case: empty update body (should not change anything)
  const emptyUpdateVariant =
    await api.functional.ecommerce.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: originalVariant.id,
        body: {} satisfies IEcommerceProductVariant.IUpdate,
      },
    );
  typia.assert(emptyUpdateVariant);
  TestValidator.equals(
    "empty update preserves SKU",
    emptyUpdateVariant.sku,
    updatedVariant.sku,
  );
  TestValidator.equals(
    "empty update preserves price_override",
    emptyUpdateVariant.price_override,
    updatedVariant.price_override,
  );
}
