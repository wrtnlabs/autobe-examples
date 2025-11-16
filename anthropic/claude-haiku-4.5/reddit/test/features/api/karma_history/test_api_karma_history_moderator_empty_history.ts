import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test karma history retrieval for a member with no karma changes.
 *
 * Validates that when retrieving karma history for a newly created member with
 * no voting activity or moderation actions, the endpoint returns an empty
 * paginated response with correct structure. Ensures pagination metadata is
 * properly returned even when zero karma history records exist.
 *
 * Test flow:
 *
 * 1. Authenticate as moderator via join operation
 * 2. Create a new member account with no karma history
 * 3. Re-authenticate as moderator to restore authorization token
 * 4. Retrieve karma history for the newly created member
 * 5. Validate response structure with empty data array
 * 6. Verify pagination metadata correctness
 */
export async function test_api_karma_history_moderator_empty_history(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = `Pass${RandomGenerator.alphaNumeric(8)}!`;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new member account with no karma history
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: `Pass${RandomGenerator.alphaNumeric(8)}!`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Re-authenticate as moderator to restore authorization token
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Step 4: Retrieve karma history for the newly created member
  const karmaHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.members.karmaHistory.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(karmaHistory);

  // Step 5: Validate response structure with empty data array
  TestValidator.equals(
    "karma history data array should be empty for new member",
    karmaHistory.data.length,
    0,
  );

  TestValidator.predicate(
    "karma history data should be an array",
    Array.isArray(karmaHistory.data),
  );

  // Step 6: Verify pagination metadata correctness
  TestValidator.equals(
    "pagination total records should be 0 for new member with no karma changes",
    karmaHistory.pagination.records,
    0,
  );

  TestValidator.predicate(
    "pagination current page should be non-negative",
    karmaHistory.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be non-negative",
    karmaHistory.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination object should be properly structured",
    karmaHistory.pagination.current !== undefined &&
      karmaHistory.pagination.limit !== undefined &&
      karmaHistory.pagination.records !== undefined &&
      karmaHistory.pagination.pages !== undefined,
  );
}
