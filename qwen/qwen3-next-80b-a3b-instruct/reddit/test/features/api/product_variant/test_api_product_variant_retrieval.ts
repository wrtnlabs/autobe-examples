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
export async function test_api_product_variant_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 3. Create product category via admin
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // 4. Create product via member connection
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: typia.random<string>(),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: (category as any).id,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(8),
              name: RandomGenerator.name(2),
              extension: "jpg",
              url: "https://cdn.example.com/image1.jpg",
              is_primary: true,
              alt_text: "Product image",
              order: 1,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // 5. Create product variant via member connection
  const variant: ICommunityPlatformProductVariant =
    await generate_random_community_platform_member_products_variants_create(
      memberConnection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          product_id: (product as any).id,
          variant_name: RandomGenerator.paragraph({ sentences: 1 }),
          price: typia.random<number & tags.Minimum<0>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
          attributes: [
            {
              productCode: product.productCode,
              key: "color",
              value: "black",
            } satisfies ICommunityPlatformProductSpecification,
            {
              productCode: product.productCode,
              key: "size",
              value: "large",
            } satisfies ICommunityPlatformProductSpecification,
          ],
        } satisfies ICommunityPlatformProductVariant.ICreate,
      },
    );
  // 6. Retrieve product variant via admin connection (using admin connection)
  const retrievedVariant: ICommunityPlatformProductVariant =
    await api.functional.communityPlatform.products.variants.at(
      adminConnection,
      {
        productCode: product.productCode,
        variantCode: variant.name, // variantCode in API is the variant name
      },
    );
  // Validate retrieved variant
  typia.assert(retrievedVariant);
  TestValidator.equals(
    "variant name matches",
    retrievedVariant.name,
    variant.name,
  );
  TestValidator.equals(
    "variant sku matches",
    retrievedVariant.sku,
    variant.sku,
  );
  TestValidator.equals(
    "variant main image matches",
    retrievedVariant.mainImage,
    variant.mainImage,
  );
  TestValidator.equals(
    "variant inventory level matches",
    retrievedVariant.inventoryLevel,
    variant.inventoryLevel,
  );
  TestValidator.equals(
    "variant availability matches",
    retrievedVariant.isAvailable,
    variant.isAvailable,
  );
  TestValidator.equals(
    "variant active status matches",
    retrievedVariant.isActive,
    variant.isActive,
  );
  TestValidator.equals(
    "variant description matches",
    retrievedVariant.description,
    variant.description,
  );
  // Validate specifications
  TestValidator.equals(
    "variant specifications count matches",
    retrievedVariant.specifications?.length,
    variant.specifications?.length,
  );
  if (retrievedVariant.specifications && variant.specifications) {
    for (let i = 0; i < retrievedVariant.specifications.length; i++) {
      TestValidator.equals(
        "specification key matches",
        retrievedVariant.specifications[i].key,
        variant.specifications[i].key,
      );
      TestValidator.equals(
        "specification value matches",
        retrievedVariant.specifications[i].value,
        variant.specifications[i].value,
      );
    }
  }
  // Verify images array
  if (retrievedVariant.images && variant.images) {
    TestValidator.equals(
      "variant images count matches",
      retrievedVariant.images.length,
      variant.images.length,
    );
    for (let i = 0; i < retrievedVariant.images.length; i++) {
      TestValidator.equals(
        "variant image matches",
        retrievedVariant.images[i],
        variant.images[i],
      );
    }
  }
}