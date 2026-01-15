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
export async function test_api_promotion_creation_with_max_uses_limit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a product to target with promotion
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8), // Fixed: use generated code instead of non-existent product.code
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [] satisfies ICommunityPlatformProductImage.ICreate[],
        },
      },
    );
  // Step 3: Create promotion with maxUses=5
  const promotion: ICommunityPlatformPromotion =
    await api.functional.communityPlatform.member.promotions.create(
      memberConnection, // ✅ Use actor-specific connection
      {
        body: {
          promotionType: "product",
          targetId: product.id,
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          discountPercentage: 10,
          visibility: "public",
          maxUses: 5,
          code: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformPromotion.ICreate,
      },
    );
  // Step 4: Validate promotion creation
  typia.assert(promotion);
  // Validate maxUses value
  TestValidator.equals("promotion maxUses should be 5", promotion.maxUses, 5);
  // Validate currentUses starts at 0
  TestValidator.equals(
    "promotion currentUses should be 0",
    promotion.currentUses,
    0,
  );
  // Validate promotionType
  TestValidator.equals(
    "promotion promotionType should be product",
    promotion.promotionType,
    "product",
  );
  // Validate targetId matches created product
  TestValidator.equals(
    "promotion targetId should match product id",
    promotion.targetId,
    product.id,
  );
  // Validate activeStartDate is set and is within expected time
  const createdAt = new Date(promotion.createdAt);
  const activeStartDate = new Date(promotion.activeStartDate);
  TestValidator.predicate(
    "activeStartDate should be equal to createdAt",
    activeStartDate.getTime() === createdAt.getTime(),
  );
  // Validate activeEndDate is exactly 7 days after creation
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "activeEndDate should be 7 days after createdAt",
    Math.abs(
      activeStartDate.getTime() +
        sevenDaysInMs -
        new Date(promotion.activeEndDate).getTime(),
    ) < 1000,
  );
}
