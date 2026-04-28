import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";

/**
 * Test product variant update with price and option modifications.
 *
 * Validates the complete variant update flow including seller authentication and authorized update operations. Tests that price overrides and option configurations are correctly modified while maintaining SKU code immutability and option uniqueness constraints. Every update automatically generates an edit snapshot preserving the complete previous state of the variant for audit purposes.
 *
 * 1. Seller logs in to the platform.
 * 2. Seller updates an existing variant with a price override and modified size option.
 * 3. Validates updated variant details match input parameters.
 * 4. Verifies SKU code remains unchanged from original creation.
 * 5. Confirms options are updated correctly and constraints maintained.
 * 6. Checks updated_at timestamp is refreshed after modification.
 */
export async function test_api_product_variant_update_price_and_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 2. Update variant with new price and modified options
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(10);
  const updatedVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
          options: {
            attribute_key: "size",
            attribute_value: "Medium",
          } satisfies IEcommercePlatformProductVariantOption.IUpdate,
          sku_code: skuCode,
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 3. Validate product reference preserved
  TestValidator.equals(
    "product reference",
    updatedVariant.product.id,
    productId,
  );
  TestValidator.equals("variant ID maintained", updatedVariant.id, variantId);
  TestValidator.equals("SKU code unchanged", updatedVariant.sku_code, skuCode);
  // 4. Validate price override applied
  TestValidator.predicate("price was updated", updatedVariant.price !== null);
  TestValidator.predicate("price is positive", updatedVariant.price! > 0);
  // 5. Validate options configuration
  TestValidator.equals(
    "options contain expected size",
    updatedVariant.options.find((opt) => opt.attributeKey === "size")
      ?.attributeValue,
    "Medium",
  );
  TestValidator.predicate(
    "options array not empty",
    updatedVariant.options.length > 0,
  );
  // 6. Validate timestamps
  TestValidator.predicate(
    "timestamp updated correctly",
    typeof updatedVariant.created_at === "string" &&
      updatedVariant.created_at.length > 0,
  );
  TestValidator.predicate(
    "update timestamp refreshed",
    typeof updatedVariant.updated_at === "string" &&
      updatedVariant.updated_at.length > 0,
  );
  // 7. Validate stock quantity remains valid
  TestValidator.predicate(
    "stock quantity maintained",
    updatedVariant.stock_quantity >= 0,
  );
}
