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
export async function test_api_promotions_search_with_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Perform search with pagination and sorting parameters
  const searchResponse =
    await api.functional.communityPlatform.promotions.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "start_date",
        order: "desc",
      } satisfies ICommunityPlatformPromotion.IRequest,
    });
  // Validate response type and structure with typia.assert
  typia.assert(searchResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20",
    searchResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records should be greater than or equal to 0",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be greater than or equal to 1",
    searchResponse.pagination.pages >= 1,
  );
  // Validate data count
  TestValidator.predicate(
    "should return at most 20 promotions on first page",
    searchResponse.data.length <= 20,
  );
  TestValidator.predicate(
    "should return at least 0 promotions",
    searchResponse.data.length >= 0,
  );
  // Verify data entries are of correct type
  for (const promotion of searchResponse.data) {
    typia.assert<ICommunityPlatformPromotion.ISummary>(promotion);
  }
  // Validate sorting: check that start dates are in descending order (latest first)
  // Only check if we have more than one promotion
  if (searchResponse.data.length > 1) {
    for (let i = 0; i < searchResponse.data.length - 1; i++) {
      const current = new Date(searchResponse.data[i].start_date);
      const next = new Date(searchResponse.data[i + 1].start_date);
      TestValidator.predicate(
        "promotions should be sorted by start_date descending",
        current >= next,
      );
    }
  }
}
