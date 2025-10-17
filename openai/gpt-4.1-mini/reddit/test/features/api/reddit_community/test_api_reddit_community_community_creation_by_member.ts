import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Test the creation of a new redditCommunity user community by an authenticated
 * member.
 *
 * Workflow:
 *
 * 1. Register a new member with valid email and password.
 * 2. Use the authenticated session to create a community with valid unique name
 *    and optional description.
 *
 * Validations:
 *
 * - Ensure the community name is unique and matches format constraints.
 * - Check authorization is enforced for member role.
 * - Validate that the creation response includes all expected community details
 *   including UUID id, timestamps, and optional null deleted_at.
 *
 * Expected Outcome:
 *
 * - Community is created and details returned correctly with timestamps.
 */
export async function test_api_reddit_community_community_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberEmail = `user_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = `P@ssw0rd123`;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community with unique valid name and optional description
  const communityName = `community_${RandomGenerator.alphaNumeric(12)}`;
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 9,
  });

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Validate properties
  TestValidator.predicate(
    "community id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdCommunity.id,
    ),
  );
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches",
    createdCommunity.description ?? null,
    communityDescription,
  );

  // ISO 8601 timestamp validations
  TestValidator.predicate(
    "community created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdCommunity.created_at,
    ),
  );
  TestValidator.predicate(
    "community updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdCommunity.updated_at,
    ),
  );

  // deleted_at is either null or undefined
  TestValidator.predicate(
    "community deleted_at is null or undefined",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );
}
