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
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_promotion } from "../../../prepare/prepare_random_community_platform_promotion";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_promotions_create } from "../../../generate/generate_random_community_platform_member_promotions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_promotion_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 3: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 4: Create product by member - generate UUID for category_id since category entity doesn't provide id but product requires UUID
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          // Use generated UUID for category_id since category lacks id property
          category_id: productId,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "Base price",
              source: "ManualEntry",
              region: "Global",
              price_type: "retail",
              tax_rate: 0.1,
              unit: "per item",
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
          images: [] satisfies ICommunityPlatformProductImage.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create promotion by member targeting the product
  const promotion =
    await generate_random_community_platform_member_promotions_create(
      memberConnection,
      {
        body: {
          promotionType: "product",
          // Use the product's real id from the returned object
          targetId: product.id,
          endDate: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          discountPercentage: 15,
          discountAmount: undefined,
          visibility: "public",
          maxUses: 100,
          notes: "Summer promotion",
        } satisfies ICommunityPlatformPromotion.ICreate,
      },
    );
  typia.assert(promotion);
  // Step 6: Admin updates promotion
  const updatedPromotion =
    await api.functional.communityPlatform.admin.promotions.update(
      adminConnection,
      {
        promotionCode: promotion.code,
        body: {
          code: promotion.code,
          name: "Updated Summer Promotion",
          description:
            "Updated promotion with new discount and extended end date",
          discountPercent: 25,
          discountAmount: undefined,
          maxUses: 200,
          usageLimitPerCustomer: 5,
          isActive: true,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
          appliesToAllProducts: false,
          productIds: [product.id],
          categories: [],
        } satisfies ICommunityPlatformPromotion.IUpdate,
      },
    );
  typia.assert(updatedPromotion);
  // Step 7: Validate the update using the updatedPromotion object returned from update call (since 'get' endpoint doesn't exist)
  // Validate all fields were updated correctly
  TestValidator.equals(
    "promotion code matches",
    updatedPromotion.code,
    promotion.code,
  );
  // Validate changes to actual properties in ICommunityPlatformPromotion
  TestValidator.equals(
    "promotion discount value updated",
    updatedPromotion.discountValue,
    25,
  );
  TestValidator.equals(
    "promotion max uses updated",
    updatedPromotion.maxUses,
    200,
  );
  TestValidator.equals("promotion is active", updatedPromotion.isActive, true);
  TestValidator.equals(
    "promotion start date updated",
    updatedPromotion.activeStartDate,
    new Date().toISOString(),
  );
  TestValidator.equals(
    "promotion end date updated",
    updatedPromotion.activeEndDate,
    new Date(Date.now() + 86400000 * 7).toISOString(),
  );
  TestValidator.equals(
    "promotion target id unchanged",
    updatedPromotion.targetId,
    product.id,
  );
}
