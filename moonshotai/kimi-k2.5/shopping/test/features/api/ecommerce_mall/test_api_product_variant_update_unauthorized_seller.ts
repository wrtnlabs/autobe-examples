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
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test that a seller cannot update a variant belonging to another seller's product.
 * This validates the authorization check that verifies product ownership.
 */
export async function test_api_product_variant_update_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup - Create category for product creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(category);
  // 2. Seller1 Setup - Create product and variant
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Authorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(seller1Connection, {
      body: {
        email: seller1Email,
        password: seller1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      },
    });
  typia.assert(seller1Authorized);
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      seller1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: category.id,
          basePrice: typia.random<number & tags.Type<"uint32">>(),
        },
      },
    );
  typia.assert(product);
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Medium",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
      },
    );
  typia.assert(variant);
  // Store original variant data
  const originalSkuCode = variant.skuCode;
  // 3. Seller2 Setup - Create unauthorized seller with different credentials
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Authorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(seller2Connection, {
      body: {
        email: seller2Email,
        password: seller2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      },
    });
  typia.assert(seller2Authorized);
  // Verify different sellers
  TestValidator.notEquals(
    "seller emails should be different",
    seller1Email,
    seller2Email,
  );
  TestValidator.notEquals(
    "seller IDs should be different",
    seller1Authorized.id,
    seller2Authorized.id,
  );
  // 4. Verify Seller1 CAN update their own variant (baseline authorization works)
  const updateBodySeller1 = {
    skuCode: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<100>>(),
    optionValues: [
      {
        optionName: "Color",
        optionValue: "Green",
      } satisfies IEcommerceMallProductVariantOption.ICreate,
    ],
  } satisfies IEcommerceMallProductVariant.IUpdate;
  const updatedBySeller1: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      seller1Connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBodySeller1,
      },
    );
  typia.assert(updatedBySeller1);
  TestValidator.notEquals(
    "variant SKU should be updated by owner",
    updatedBySeller1.skuCode,
    originalSkuCode,
  );
  // 5. Verify Seller2 CANNOT update Seller1's variant - Should return 403 Forbidden
  const updateBodySeller2 = {
    skuCode: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<200>>(),
    optionValues: [
      {
        optionName: "Color",
        optionValue: "Blue",
      } satisfies IEcommerceMallProductVariantOption.ICreate,
    ],
  } satisfies IEcommerceMallProductVariant.IUpdate;
  await TestValidator.httpError(
    "unauthorized seller variant update must return 403 Forbidden",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.update(
        seller2Connection,
        {
          productId: product.id,
          variantId: variant.id,
          body: updateBodySeller2,
        },
      );
    },
  );
}
