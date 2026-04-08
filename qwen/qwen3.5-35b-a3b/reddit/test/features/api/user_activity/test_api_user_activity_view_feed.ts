import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";
import type { IRedditPlatformUserActivityCommentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityCommentSummary";
import type { IRedditPlatformUserActivityPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityPostSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_activity_view_feed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (viewer) authenticates
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuthorized: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(viewerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123",
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(viewerAuthorized);
  // 2. Member B (activity creator) authenticates
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuthorized: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(creatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123",
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(creatorAuthorized);
  // 3. Member A fetches Member B's activity feed
  const response: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.member.users.activity.index(
      viewerConnection,
      {
        username: creatorAuthorized.username,
        body: {
          page: 1,
          limit: 20,
          contentType: "both",
          sortBy: "createdAt",
          sortOrder: "desc",
          includeDeleted: false,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  typia.assert(response.data);
  // 6. Validate sorting order (createdAt descending)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate: Date = new Date(response.data[i - 1].createdAt);
      const currDate: Date = new Date(response.data[i].createdAt);
      TestValidator.predicate(
        "activities sorted by createdAt descending",
        prevDate >= currDate,
      );
    }
  }
  // 7. Validate pagination metadata accuracy
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    response.data.length > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0,
  );
  TestValidator.predicate(
    "records count matches data length for current page",
    response.data.length <= response.pagination.records,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 8. Validate each activity item structure
  for (const activity of response.data) {
    // Validate activity has all required fields
    TestValidator.notEquals("activity has valid id", activity.id, undefined);
    TestValidator.notEquals(
      "activity has valid communityName",
      activity.communityName,
      undefined,
    );
    TestValidator.notEquals(
      "activity has valid createdAt",
      activity.createdAt,
      undefined,
    );
    TestValidator.notEquals(
      "activity has valid isDeleted",
      activity.isDeleted,
      undefined,
    );
    TestValidator.notEquals(
      "activity has valid type discriminator",
      activity.type,
      undefined,
    );
    // Validate ISO datetime format
    const date: Date = new Date(activity.createdAt);
    TestValidator.predicate("createdAt is valid date", !isNaN(date.getTime()));
    // Validate content length for comment items
    if (activity.type === "comment") {
      const commentSummary: IRedditPlatformUserActivityCommentSummary =
        activity;
      TestValidator.predicate(
        "comment content length is reasonable",
        commentSummary.content.length <= 200,
      );
    }
    // Validate title exists for post items
    if (activity.type === "post") {
      const postSummary: IRedditPlatformUserActivityPostSummary = activity;
      TestValidator.notEquals(
        "post has valid title",
        postSummary.title,
        undefined,
      );
    }
  }
}
