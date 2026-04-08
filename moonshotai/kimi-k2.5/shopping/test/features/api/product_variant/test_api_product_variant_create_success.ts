import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create category as admin (prerequisite for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 3. Seller setup - Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const sellerAuthorized = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuthorized);
  // 4. Create product as seller (prerequisite for variant creation)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Create variant for the product
  const inputSkuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const inputPrice = typia.random<
    number & tags.Minimum<1> & tags.Maximum<100000>
  >();
  const inputOptions = [
    {
      optionName: "Color",
      optionValue: RandomGenerator.pick([
        "Red",
        "Blue",
        "Green",
        "Black",
        "White",
      ]),
    },
    {
      optionName: "Size",
      optionValue: RandomGenerator.pick(["S", "M", "L", "XL", "XXL"]),
    },
  ];
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: inputSkuCode,
          price: inputPrice,
          options: inputOptions,
        },
      },
    );
  // 6. Validate the variant response
  typia.assert(variant);
  // Business logic validations only (typia.assert handles all type validation)
  TestValidator.equals(
    "variant SKU matches input",
    variant.skuCode,
    inputSkuCode,
  );
  TestValidator.equals(
    "variant price matches input",
    variant.price,
    inputPrice,
  );
  TestValidator.equals(
    "variant product reference matches",
    variant.product.id,
    product.id,
  );
  TestValidator.equals("variant is not deleted", variant.deletedAt, null);
  TestValidator.equals(
    "variant options count matches input",
    variant.variantOptions.length,
    2,
  );
  // Validate option values are stored correctly
  const colorOption = variant.variantOptions.find(
    (opt) => opt.optionName === "Color",
  );
  const sizeOption = variant.variantOptions.find(
    (opt) => opt.optionName === "Size",
  );
  TestValidator.predicate("Color option exists", colorOption !== undefined);
  TestValidator.predicate("Size option exists", sizeOption !== undefined);
  if (colorOption !== undefined) {
    TestValidator.equals(
      "Color option value matches input",
      colorOption.optionValue,
      inputOptions[0].optionValue,
    );
  }
  if (sizeOption !== undefined) {
    TestValidator.equals(
      "Size option value matches input",
      sizeOption.optionValue,
      inputOptions[1].optionValue,
    );
  }
}
