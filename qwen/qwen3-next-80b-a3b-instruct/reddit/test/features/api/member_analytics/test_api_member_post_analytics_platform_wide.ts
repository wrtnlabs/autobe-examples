import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostAnalytic";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_post_analytics_platform_wide(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member to create a valid connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Call the analytics endpoint with empty request body for platform-wide view
  const analytics =
    await api.functional.redditCommunity.member.analytics.posts.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(analytics);
  // Validate that pagination has default values (20 records per page)
  TestValidator.equals(
    "pagination limit is default 20",
    analytics.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current page is default 1",
    analytics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    analytics.pagination.pages >= 0,
  );
  // Validate that data array contains at least one entry (assuming platform has data)
  // Note: We assume the platform has historical post data - we cannot create data
  TestValidator.predicate("data array is not empty", analytics.data.length > 0);
  // Validate each analytics record has required properties
  for (const day of analytics.data) {
    // Use typia.assertGuard to validate the entire object and narrow types
    typia.assertGuard(day);
    // Validate required properties are present and of correct types
    TestValidator.predicate(
      "total_posts is a non-negative integer",
      Number.isSafeInteger(day.total_posts) && day.total_posts >= 0,
    );
    TestValidator.predicate(
      "avg_vote_score is a number",
      typeof day.avg_vote_score === "number",
    );
    TestValidator.predicate(
      "total_upvotes is a non-negative integer",
      Number.isSafeInteger(day.total_upvotes) && day.total_upvotes >= 0,
    );
    TestValidator.predicate(
      "total_downvotes is a non-negative integer",
      Number.isSafeInteger(day.total_downvotes) && day.total_downvotes >= 0,
    );
    TestValidator.predicate(
      "total_comments is a non-negative integer",
      Number.isSafeInteger(day.total_comments) && day.total_comments >= 0,
    );
    // Note: 'date' is validated as date-time format by typia.assertGuard
  }
}
