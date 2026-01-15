import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPromotion";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_promotions_search_filtered_by_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Define search criteria for promotions
  const searchCriteria: ICommunityPlatformPromotion.IRequest = {
    page: 1,
    limit: 10,
    type: "percentage", // Removed satisfies string as string - TypeScript can infer literal type
    min_discount_value: 10,
    end_date_gte: "2024-12-01",
    target_audience: "loyalty_members",
  } satisfies ICommunityPlatformPromotion.IRequest;
  // Step 3: Perform search with authenticated connection (fixed: was using connection, now using memberConnection)
  const result: IPageICommunityPlatformPromotion.ISummary =
    await api.functional.communityPlatform.promotions.index(
      memberConnection, // FIXED: Using authenticated memberConnection, not base connection
      { body: searchCriteria },
    );
  // Step 4: Validate response structure
  typia.assert(result);
  // Step 5: Validate pagination
  TestValidator.equals("page number should be 1", result.pagination.current, 1);
  TestValidator.equals("limit should be 10", result.pagination.limit, 10);
  // Step 6: Validate that all returned promotions match search criteria
  for (const promotion of result.data) {
    // Check promotion type
    TestValidator.equals(
      "promotion type should be percentage",
      promotion.type,
      "percentage", // Removed satisfies string as string - TypeScript can infer literal type
    );
    // Check discount value is at least 10%
    TestValidator.predicate(
      "discount value should be at least 10",
      promotion.discount_value >= 10,
    );
    // Check end date is on or after December 1st, 2024
    const endDate = new Date(promotion.end_date);
    const cutoffDate = new Date("2024-12-01T00:00:00Z");
    TestValidator.predicate(
      "end date should be on or after 2024-12-01",
      endDate >= cutoffDate,
    );
    // Check target audience is loyalty_members
    TestValidator.equals(
      "target audience should be loyalty_members",
      promotion.target_audience,
      "loyalty_members",
    );
  }
}