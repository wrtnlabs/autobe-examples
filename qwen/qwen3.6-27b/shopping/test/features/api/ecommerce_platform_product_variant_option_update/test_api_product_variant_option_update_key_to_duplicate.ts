import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_options_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

export async function test_api_product_variant_option_update_key_to_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin registers and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic products and accessories",
        },
      },
    );
  typia.assert(category);
  // Step 2: Seller registers and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 3: Seller creates a product in the admin-created category
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        base_price: 149.99,
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 4: Seller creates a variant with an initial option (color=Red)
  const initialOptionBody = {
    attributeKey: "color",
    attributeValue: "Red",
  } satisfies IEcommercePlatformProductVariantOption.ICreate;
  const variantBody: IEcommercePlatformProductVariant.ICreate = {
    skuCode: "HEADPHONES-WLH-001",
    options: [initialOptionBody],
  };
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: variantBody,
      },
    );
  typia.assert(variant);
  // Step 5: Seller creates a second option (size=Large) on the same variant
  const secondOption =
    await api.functional.ecommercePlatform.seller.products.variants.options.create(
      sellerConnection,
      {
        productId: product.id,
        skuCode: variant.sku_code,
        body: {
          attributeKey: "size",
          attributeValue: "Large",
        } satisfies IEcommercePlatformProductVariantOption.ICreate,
      },
    );
  typia.assert(secondOption);
  // Step 6: Verify the second option was created correctly
  TestValidator.equals(
    "second option attribute_key is size",
    secondOption.attributeKey,
    "size",
  );
  TestValidator.equals(
    "second option attribute_value is Large",
    secondOption.attributeValue,
    "Large",
  );
  // Step 7: Attempt to update the second option's attribute_key to 'color' (conflicts with existing option)
  await TestValidator.error(
    "update rejected due to duplicate attribute_key 'color' on same variant",
    async () => {
      await api.functional.ecommercePlatform.seller.products.variants.options.update(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          optionId: secondOption.id,
          body: {
            attribute_key: "color", // This conflicts with the existing color=Red option on the same variant
          } satisfies IEcommercePlatformProductVariantOption.IUpdate,
        },
      );
    },
  );
}
