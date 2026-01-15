import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import type { ICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariant";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_variant } from "../../../prepare/prepare_random_community_platform_product_variant";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_products_variants_create } from "../../../generate/generate_random_community_platform_member_products_variants_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_variant_deletion_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to create account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // Step 2: Create a product using the authenticated member connection
  const productCode = RandomGenerator.alphaNumeric(10);
  const productData: ICommunityPlatformProduct.ICreate = {
    code: productCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    prices: [
      {
        product_code: productCode,
        currency_code: "USD",
        amount: 99.99,
        effective_from: new Date().toISOString(),
      } satisfies ICommunityPlatformProductPrice.ICreate,
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      { body: productData },
    );
  // Step 3: Create a variant for the product using the member connection
  const variantData: ICommunityPlatformProductVariant.ICreate = {
    product_id: product.id,
    variant_name: "Black 256GB",
    price: 99.99,
    stock_quantity: 10,
    is_active: true,
    attributes: [
      {
        productCode: product.productCode,
        key: "color",
        value: "black",
      } satisfies ICommunityPlatformProductSpecification,
      {
        productCode: product.productCode,
        key: "storage",
        value: "256GB",
      } satisfies ICommunityPlatformProductSpecification,
    ],
  } satisfies ICommunityPlatformProductVariant.ICreate;
  const variant =
    await generate_random_community_platform_member_products_variants_create(
      memberConnection,
      {
        body: variantData,
        params: { productCode: product.productCode },
      },
    );
  // Step 4: Delete the variant using the member connection
  await api.functional.communityPlatform.member.products.variants.erase(
    memberConnection,
    {
      productCode: product.productCode,
      variantCode: variant.sku,
    },
  );
  // Step 5: Verify deletion by trying to recreate variant with same SKU
  // We should be able to recreate it since it was deleted
  const recreatedVariant =
    await generate_random_community_platform_member_products_variants_create(
      memberConnection,
      {
        body: variantData,
        params: { productCode: product.productCode },
      },
    );
  typia.assert(recreatedVariant);
  // Step 6: Verify that another member cannot delete the variant (test ownership enforcement)
  // Create second member
  const unauthorizedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedMemberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const unauthorizedMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(unauthorizedMemberConnection, {
      body: unauthorizedMemberData,
    });
  // Create a new product for unauthorized member
  const unauthorizedProductData: ICommunityPlatformProduct.ICreate = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    prices: [
      {
        product_code: "prod456",
        currency_code: "USD",
        amount: 99.99,
        effective_from: new Date().toISOString(),
      } satisfies ICommunityPlatformProductPrice.ICreate,
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const unauthorizedProduct: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      unauthorizedMemberConnection,
      { body: unauthorizedProductData },
    );
  // Create a variant for the unauthorized member's product
  const unauthorizedVariantData: ICommunityPlatformProductVariant.ICreate = {
    product_id: unauthorizedProduct.id,
    variant_name: "Blue 128GB",
    price: 79.99,
    stock_quantity: 15,
    is_active: true,
    attributes: [
      {
        productCode: unauthorizedProduct.productCode,
        key: "color",
        value: "blue",
      } satisfies ICommunityPlatformProductSpecification,
      {
        productCode: unauthorizedProduct.productCode,
        key: "storage",
        value: "128GB",
      } satisfies ICommunityPlatformProductSpecification,
    ],
  } satisfies ICommunityPlatformProductVariant.ICreate;
  const unauthorizedVariant =
    await generate_random_community_platform_member_products_variants_create(
      unauthorizedMemberConnection,
      {
        body: unauthorizedVariantData,
        params: { productCode: unauthorizedProduct.productCode },
      },
    );
  // Attempt to delete unauthorized member's variant with original member (should fail)
  await TestValidator.error(
    "original member cannot delete another member's variant",
    async () => {
      await api.functional.communityPlatform.member.products.variants.erase(
        memberConnection,
        {
          productCode: unauthorizedProduct.productCode,
          variantCode: unauthorizedVariant.sku,
        },
      );
    },
  );
}
