import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving a paginated list of moderators for a valid community.
 *
 * Validates the community moderator listing endpoint with proper pagination support and data structure verification. Ensures that moderator assignments are correctly exposed with member and community context for governance transparency.
 *
 * The test authenticates as a guest user, queries the moderators endpoint with pagination parameters, and validates the response structure including pagination metadata and nested summary objects.
 *
 * 1. Guest user authenticates via device fingerprint registration.
 * 2. Query moderators list with custom pagination parameters.
 * 3. Validates pagination metadata contains correct current page, limit, records, and pages.
 * 4. Validates pagination math: pages equals ceiling of records divided by limit.
 * 5. Validates data array length does not exceed the requested limit.
 * 6. Validates each moderator entry contains member summary with required fields.
 * 7. Validates each moderator entry contains community summary with required fields.
 * 8. Validates moderators are ordered by created_at DESC (newest first).
 * 9. Validates response conforms to IPageIRedditLikeCommunityModerator.ISummary type.
 */
export async function test_api_community_moderator_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Query moderators list with custom pagination
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const result: IPageIRedditLikeCommunityModerator.ISummary =
    await api.functional.redditLike.guest.communities.moderators.index(
      guestConnection,
      {
        communityId,
        body: {
          limit,
          offset: 0,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate pagination math
  const expectedPages = Math.ceil(result.pagination.records / limit);
  TestValidator.equals(
    "pagination pages calculation",
    result.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array length
  TestValidator.predicate(
    "data array length does not exceed limit",
    result.data.length <= limit,
  );
  TestValidator.equals(
    "data array length matches records on last page",
    result.data.length,
    result.pagination.records > 0
      ? Math.min(result.pagination.records, limit)
      : 0,
  );
  // 6. Validate moderator ordering by created_at DESC
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        `moderator ${i} created_at >= moderator ${i + 1} created_at`,
        result.data[i].created_at >= result.data[i + 1].created_at,
      );
    }
  }
  // 7. Validate member summary fields exist (business logic, not types)
  for (const moderator of result.data) {
    TestValidator.predicate(
      "member has non-empty username",
      moderator.member.username.length > 0,
    );
    TestValidator.predicate(
      "member has non-empty display_name",
      moderator.member.display_name.length > 0,
    );
    TestValidator.predicate(
      "member karma_score is integer",
      Number.isInteger(moderator.member.karma_score),
    );
    // 8. Validate community summary fields exist (business logic, not types)
    TestValidator.predicate(
      "community has non-empty name",
      moderator.community.name.length > 0,
    );
    TestValidator.predicate(
      "community owner exists",
      moderator.community.owner !== null &&
        moderator.community.owner !== undefined,
    );
    TestValidator.predicate(
      "community subscriber_count is non-negative",
      moderator.community.subscriber_count >= 0,
    );
  }
}
