import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_histories_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Test first page with limit 5
  const page1Response =
    await api.functional.communityPlatform.moderator.histories.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata for first page
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 valid limit",
    page1Response.pagination.limit === 5,
  );
  // Test second page with same limit
  const page2Response =
    await api.functional.communityPlatform.moderator.histories.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata for second page
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 valid limit",
    page2Response.pagination.limit === 5,
  );
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2Response.pagination.pages,
    page1Response.pagination.pages,
  );
  // Ensure no duplicates between page 1 and page 2
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1Ids = new Set(page1Response.data.map((item) => item.id));
    const page2Ids = new Set(page2Response.data.map((item) => item.id));
    // Check for intersection - should be empty if no duplicates
    const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
    TestValidator.equals(
      "no duplicate records between pages",
      intersection.length,
      0,
    );
  }
  // Test edge case: page beyond total pages (ensure it's truly beyond)
  const beyondPage =
    page1Response.pagination.pages > 0
      ? page1Response.pagination.pages + 1
      : 999;
  const beyondPageResponse =
    await api.functional.communityPlatform.moderator.histories.index(
      moderatorConnection,
      {
        body: {
          page: beyondPage,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  // Validate pagination metadata for beyond page
  TestValidator.equals(
    "beyond page current page",
    beyondPageResponse.pagination.current,
    beyondPage,
  );
  TestValidator.predicate(
    "beyond page valid limit",
    beyondPageResponse.pagination.limit === 5,
  );
  TestValidator.equals(
    "beyond page total records",
    beyondPageResponse.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "beyond page total pages",
    beyondPageResponse.pagination.pages,
    page1Response.pagination.pages,
  );
  // Data should be empty when requesting page beyond total pages
  TestValidator.equals(
    "beyond page empty data",
    beyondPageResponse.data.length,
    0,
  );
  // Test edge case: limit at maximum (100) - schema constraint
  const maxLimitResponse =
    await api.functional.communityPlatform.moderator.histories.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum allowed by schema
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  // The limit should be exactly 100
  TestValidator.equals(
    "limit at maximum 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "current page for max limit",
    maxLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records consistent",
    maxLimitResponse.pagination.records,
    page1Response.pagination.records,
  );
}
