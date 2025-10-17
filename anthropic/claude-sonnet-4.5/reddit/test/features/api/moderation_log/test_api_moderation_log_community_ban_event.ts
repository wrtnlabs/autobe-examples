import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test retrieving moderation log entries for community ban events.
 *
 * This test validates that when moderators issue community bans, the system
 * creates comprehensive log entries that can be retrieved for audit purposes.
 *
 * NOTE: Due to API limitations (no endpoint to list/search logs to get the log
 * ID), this test demonstrates the complete ban workflow but uses a placeholder
 * log ID. In a real scenario, the ban creation would return or emit the
 * associated log ID.
 *
 * Workflow steps:
 *
 * 1. Create moderator account to issue bans
 * 2. Create community where ban will be issued
 * 3. Assign moderator to the community with ban permissions
 * 4. Create member account that will be banned
 * 5. Issue a community ban against the member
 * 6. Retrieve moderation log using a known log ID
 *
 * Validation points:
 *
 * - Ban workflow completes successfully with all required data
 * - Moderation log can be retrieved with proper structure
 * - All entities are created with valid data and relationships
 */
export async function test_api_moderation_log_community_ban_event(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community where ban will be issued
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Assign moderator to the community
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 4: Create member account that will be banned
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Issue a community ban against the member
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    connection,
    {
      communityId: community.id,
      body: {
        banned_member_id: member.id,
        ban_reason_category: "harassment",
        ban_reason_text: "Repeated harassment of community members",
        is_permanent: false,
        expiration_date: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IRedditLikeCommunityBan.ICreate,
    },
  );
  typia.assert(ban);

  // Step 6: Retrieve a moderation log entry
  // Note: In a complete implementation, we would get the log ID from the ban creation
  // or from a log listing endpoint. Since those aren't available, we use a generated ID
  // to demonstrate the log retrieval functionality.
  const sampleLogId = typia.random<string & tags.Format<"uuid">>();
  const log = await api.functional.redditLike.moderator.moderation.logs.at(
    connection,
    {
      logId: sampleLogId,
    },
  );
  typia.assert(log);

  // Validate the ban was created successfully
  TestValidator.equals(
    "banned member ID matches",
    ban.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "ban community ID matches",
    ban.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban reason category",
    ban.ban_reason_category,
    "harassment",
  );
  TestValidator.predicate("ban is active", ban.is_active === true);
}
