import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test customer order creation workflow.
 * 1. Admin creates category
 * 2. Seller registers and logs in
 * 3. Seller creates product
 * 4. Seller creates variant
 * 5. Seller updates variant with new SKU and option values
 * 6. Validate updated variant and snapshot creation
 */
export async function test_api_product_variant_update_sku_and_options(
  connection: api.IConnection,
) {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller registers and logs in
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
    typia.random<string & tags.Format<"email">>()
  );
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Login seller with stored credentials
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates initial variant
  const initialVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  // 5. Seller updates variant with new SKU and option values
  const newSkuCode = `SKU-UPDATED-${RandomGenerator.alphaNumeric(6)}`;
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          skuCode: newSkuCode,
          optionValues: {
            color: "Blue",
            size: "Medium",
            material: "Cotton",
          },
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6. Validate updated variant
  TestValidator.equals("SKU code updated", updatedVariant.skuCode, newSkuCode);
  TestValidator.equals(
    "Option values updated",
    updatedVariant.optionValues.color,
    "Blue",
  );
  TestValidator.equals(
    "Option values updated",
    updatedVariant.optionValues.size,
    "Medium",
  );
  TestValidator.equals(
    "Option values updated",
    updatedVariant.optionValues.material,
    "Cotton",
  );
  TestValidator.predicate(
    "Stock quantity exists",
    updatedVariant.stockQuantity >= 0,
  );
  // 7. Test duplicate SKU rejection
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSellerAuth = await authorize_seller_join(
    anotherSellerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>()
        ),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(anotherSellerAuth);
  await authorize_seller_login(anotherSellerConnection, {
    body: {
      email: anotherSellerAuth.seller.email,
      password: anotherSellerAuth.token.access,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const anotherProduct =
    await api.functional.ecommerceMall.seller.products.create(
      anotherSellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(anotherProduct);
  await TestValidator.error("duplicate SKU code rejected", async () => {
    await api.functional.ecommerceMall.seller.products.variants.create(
      anotherSellerConnection,
      {
        productId: anotherProduct.id,
        body: {
          skuCode: newSkuCode, // Duplicate of updated variant's SKU
          optionValues: [
            { key: "color", value: "Green" },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: 10,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  });
}