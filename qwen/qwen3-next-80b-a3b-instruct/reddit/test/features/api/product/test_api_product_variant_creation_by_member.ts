import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import type { ICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariant";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_variant } from "../../../prepare/prepare_random_community_platform_product_variant";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_products_variants_create } from "../../../generate/generate_random_community_platform_member_products_variants_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Skip category creation - use a generated UUID for category_id since ICommunityPlatformProductCategory doesn't have an id field
  // According to ICommunityPlatformProduct.ICreate, category_id must be a UUID, even though category creation doesn't return an id
  // This is a workaround for the schema inconsistency
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create product with the category (member operation)
  // Generate product data
  const productData = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    // Use a generated UUID for category_id since category creation doesn't return an id
    category_id: categoryId,
    prices: [
      {
        product_code: RandomGenerator.alphaNumeric(10),
        currency_code: "USD",
        amount: typia.random<number & tags.Minimum<0> & tags.Maximum<1000>>(),
        effective_from: new Date().toISOString(),
      } satisfies ICommunityPlatformProductPrice.ICreate,
    ],
    images: [],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      { body: productData },
    );
  typia.assert(product);
  // Step 5: Create product variant (member operation)
  // Use correct property names from ICommunityPlatformProductVariant.ICreate
  const variantName = RandomGenerator.name(2);
  const stockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const isActive = true;
  const price = typia.random<number & tags.Minimum<0>>(); // Required price field
  const variant =
    await generate_random_community_platform_member_products_variants_create(
      memberConnection,
      {
        body: {
          product_id: product.id,
          variant_name: variantName,
          stock_quantity: stockQuantity,
          is_active: isActive,
          // Add required price field
          price: price,
          attributes: [
            {
              // Use product.productCode as required by ICommunityPlatformProductSpecification
              productCode: product.productCode,
              key: "color",
              value: RandomGenerator.pick([
                "red",
                "blue",
                "green",
                "black",
                "white",
              ]),
            } satisfies ICommunityPlatformProductSpecification,
            {
              productCode: product.productCode,
              key: "size",
              value: RandomGenerator.pick([
                "small",
                "medium",
                "large",
                "extra large",
              ]),
            } satisfies ICommunityPlatformProductSpecification,
          ],
        } satisfies ICommunityPlatformProductVariant.ICreate,
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(variant);
  // Validate variant creation with response type properties
  TestValidator.equals(
    "variant name matches",
    variant.name, // Response property
    variantName,
  );
  TestValidator.equals(
    "variant inventory matches",
    variant.inventoryLevel, // Response property
    stockQuantity,
  );
  TestValidator.equals("variant is active", variant.isActive, isActive); // Response property matches what we sent
  TestValidator.equals("variant is available", variant.isAvailable, isActive);
  // Validate SKU is present and valid
  TestValidator.predicate(
    "variant has SKU",
    variant.sku !== "" && variant.sku.length > 0,
  );
  // Handle specifications optional chaining with === true
  TestValidator.predicate(
    "variant has attributes",
    variant.specifications !== undefined && variant.specifications.length > 0,
  );
  // Only access specifications if it exists
  if (variant.specifications && variant.specifications.length > 0) {
    TestValidator.equals(
      "variant has color attribute",
      variant.specifications[0].key,
      "color",
    );
    TestValidator.equals(
      "variant has size attribute",
      variant.specifications[1].key,
      "size",
    );
    TestValidator.predicate(
      "variant color attribute has non-empty value",
      !!variant.specifications[0].value,
    );
    TestValidator.predicate(
      "variant size attribute has non-empty value",
      !!variant.specifications[1].value,
    );
  }
  // Validate main image is present and is a valid URI
  TestValidator.predicate("variant has main image", variant.mainImage !== "");
  TestValidator.predicate(
    "variant main image is valid URI",
    /^https?:\/\/.+/.test(variant.mainImage),
  );
}
