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
import type { ICommunityPlatformProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariantAttributes";
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
export async function test_api_product_variant_update_inventory_only(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  adminConnection.headers = { Authorization: admin.token.access };
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  memberConnection.headers = { Authorization: member.token.access };
  // Step 3: Create a product category
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // We need to 'cast' category to have id property even though not in DTO
  // because the real response from the API has it
  const categoryWithId = typia.assert<
    ICommunityPlatformProductCategory & {
      id: string;
    }
  >(category);
  // Step 4: Create a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryWithId.id, // Now safe to use
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 99.99,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create a product variant with specifications
  // Create an array of specifications for the variant
  const specifications: ICommunityPlatformProductSpecification[] = [
    {
      productCode: product.productCode,
      key: "color",
      value: "black",
    },
    {
      productCode: product.productCode,
      key: "size",
      value: "medium",
    },
  ];
  const variant: ICommunityPlatformProductVariant =
    await generate_random_community_platform_member_products_variants_create(
      memberConnection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          product_id: product.id,
          variant_name: RandomGenerator.name(),
          stock_quantity: 10,
          is_active: true,
          attributes: specifications, // Use array of ICommunityPlatformProductSpecification
          price: 100.0,
        } satisfies ICommunityPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 6: Update only inventoryLevel
  const updatedVariant: ICommunityPlatformProductVariant =
    await api.functional.communityPlatform.member.products.variants.update(
      memberConnection,
      {
        productCode: product.productCode,
        variantCode: variant.sku,
        body: {
          inventoryLevel: 100,
        } satisfies ICommunityPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Step 7: Validate all properties except inventoryLevel remain unchanged
  TestValidator.equals(
    "variant name unchanged",
    updatedVariant.name,
    variant.name,
  );
  TestValidator.equals(
    "variant description unchanged",
    updatedVariant.description,
    variant.description,
  );
  TestValidator.equals(
    "variant mainImage unchanged",
    updatedVariant.mainImage,
    variant.mainImage,
  );
  TestValidator.equals(
    "variant isAvailable unchanged",
    updatedVariant.isAvailable,
    variant.isAvailable,
  );
  TestValidator.equals(
    "variant isActive unchanged",
    updatedVariant.isActive,
    variant.isActive,
  );
  // Validate specifications remain unchanged
  // The created variant's specifications should match the ones we provided
  // Note: variant.specifications is the field we need to compare with our specifications array
  // We need to confirm the arrays are equal in content
  TestValidator.equals(
    "specifications unchanged",
    updatedVariant.specifications,
    specifications,
  );
  // Step 8: Validate inventoryLevel was updated
  TestValidator.equals(
    "inventory level updated",
    updatedVariant.inventoryLevel,
    100,
  );
}
