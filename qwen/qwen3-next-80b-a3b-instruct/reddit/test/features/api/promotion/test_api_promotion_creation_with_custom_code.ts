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
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_promotion } from "../../../prepare/prepare_random_community_platform_promotion";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_promotions_create } from "../../../generate/generate_random_community_platform_member_promotions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_promotion_creation_with_custom_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create product to target with promotion
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {},
    );
  // Step 3: Create promotion with custom code 'SUMMER2024'
  const promotion: ICommunityPlatformPromotion =
    await api.functional.communityPlatform.member.promotions.create(
      memberConnection,
      {
        body: {
          promotionType: "product", // Must be exactly 'product' as defined in ICommunityPlatformPromotion.ICreate
          targetId: product.id, // Target the created product
          endDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days in future
          discountPercentage: 15, // 15% discount
          maxUses: 100,
          code: "SUMMER2024", // Custom code as specified in scenario
          visibility: "public", // Required property missing
          targetCategoryIds: undefined, // Changed from null to undefined to match type string[] | undefined
        } satisfies ICommunityPlatformPromotion.ICreate,
      },
    );
  // Step 4: Validate promotion creation
  typia.assert(promotion);
  // Validate specific promotion properties that exist on ICommunityPlatformPromotion
  TestValidator.equals("custom code matches", promotion.code, "SUMMER2024");
  TestValidator.equals("promotion is active", promotion.isActive, true);
  TestValidator.predicate(
    "end date is in future",
    new Date(promotion.activeEndDate) > new Date(),
  );
  TestValidator.equals(
    "promotion type is product",
    promotion.promotionType,
    "product",
  );
  TestValidator.equals(
    "target product ID matches",
    promotion.targetId,
    product.id,
  );
  TestValidator.equals(
    "discount type is percentage",
    promotion.discountType,
    "percentage",
  );
  TestValidator.equals(
    "discount value is correct",
    promotion.discountValue,
    15,
  );
  TestValidator.equals("max uses is correct", promotion.maxUses, 100);
  TestValidator.equals(
    "created by member matches",
    promotion.createdById,
    member.id,
  );
  // Note: promotion.notes and promotion.targetCategoryIds do not exist on ICommunityPlatformPromotion - removed validation
  TestValidator.equals(
    "minPurchaseAmount is undefined",
    promotion.minPurchaseAmount,
    undefined,
  );
}