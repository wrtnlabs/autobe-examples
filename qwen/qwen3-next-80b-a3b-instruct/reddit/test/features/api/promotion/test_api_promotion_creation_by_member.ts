import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformChannelSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannelSettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_promotion } from "../../../prepare/prepare_random_community_platform_promotion";
import { prepare_random_community_platform_channel } from "../../../prepare/prepare_random_community_platform_channel";
import { generate_random_community_platform_admin_channels_create } from "../../../generate/generate_random_community_platform_admin_channels_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_promotions_create } from "../../../generate/generate_random_community_platform_member_promotions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_promotion_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and create an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminData: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/home",
    ip: null,
  };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminData },
  );
  // Step 2: Create member connection and register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    href: "https://example.com/member/join",
    referrer: "https://example.com/home",
  };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // Step 3: Create a community using admin connection
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(communityConnection, {
    body: {
      email: adminData.email,
      password: adminPassword,
      href: "https://example.com/admin/login", // Added required href property
      referrer: "https://example.com/dashboard", // Added required referrer property
    },
  });
  const community: ICommunityPlatformChannel =
    await generate_random_community_platform_admin_channels_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          is_public: true,
          settings: "default settings",
        },
      },
    );
  // Step 4: Create a product using member connection
  const productConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(productConnection, {
    body: {
      email: memberData.email,
      password: memberPassword,
    },
  });
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      productConnection,
      {
        body: {
          code: `prod-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: `prod-${RandomGenerator.alphaNumeric(8)}`,
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ],
        },
      },
    );
  // Step 5: Create a promotion using member connection targeting the product
  // We remain on memberConnection as the same member creates promotion for their own product
  const promotion: ICommunityPlatformPromotion =
    await generate_random_community_platform_member_promotions_create(
      memberConnection,
      {
        body: {
          promotionType: "product",
          targetId: product.id,
          endDate: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
          discountPercentage: 20,
          visibility: "public",
          maxUses: 100,
          code: `PROMO-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
          notes: "20% discount for 30 days",
        },
      },
    );
  // Step 6: Validate promotion creation
  TestValidator.equals("promotion type", promotion.promotionType, "product");
  TestValidator.equals("target ID", promotion.targetId, product.id);
  TestValidator.equals("discount type", promotion.discountType, "percentage");
  TestValidator.equals("discount value", promotion.discountValue, 20);
  TestValidator.predicate(
    "discount value is between 0 and 100",
    promotion.discountValue >= 0 && promotion.discountValue <= 100,
  );
  TestValidator.equals("max uses", promotion.maxUses, 100);
  TestValidator.equals("current uses", promotion.currentUses, 0);
  TestValidator.predicate(
    "active start date is valid",
    new Date(promotion.activeStartDate) <= new Date(),
  );
  TestValidator.predicate(
    "active end date is valid",
    new Date(promotion.activeEndDate) > new Date(),
  );
  TestValidator.equals("is active", promotion.isActive, true);
  TestValidator.equals("created by ID", promotion.createdById, member.id);
  TestValidator.predicate(
    "promotion code is valid format",
    /^PROMO-[A-Z0-9]{6}$/.test(promotion.code),
  );
}
