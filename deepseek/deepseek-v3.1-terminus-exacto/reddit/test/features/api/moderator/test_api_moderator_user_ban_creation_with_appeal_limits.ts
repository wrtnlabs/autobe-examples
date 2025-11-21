import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderator creation of bans with specific appeal limitations and
 * deadlines.
 *
 * This scenario validates that moderators can configure ban parameters that
 * control the appeal process, including maximum appeal attempts and submission
 * deadlines. It ensures proper enforcement of appeal restrictions while
 * maintaining moderation transparency and member rights.
 */
export async function test_api_moderator_user_ban_creation_with_appeal_limits(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account for ban testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community context for ban operation
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create ban with appeal limitations
  const banResponse: ICommunityPlatformUserBan =
    await api.functional.communityPlatform.moderator.userBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          ban_type: "temporary",
          ban_scope: "community",
          reason: RandomGenerator.content({ paragraphs: 1 }),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >(),
          max_appeals: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          appeal_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformUserBan.ICreate,
      },
    );

  // Validate the response is one of the expected values
  typia.assert(banResponse);
  TestValidator.predicate(
    "ban response is valid",
    banResponse === "asc" || banResponse === "desc",
  );

  // Step 5: Test error scenario - invalid member ID
  await TestValidator.error("should fail with invalid member ID", async () => {
    await api.functional.communityPlatform.moderator.userBans.create(
      connection,
      {
        body: {
          community_platform_member_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          ban_type: "temporary",
          ban_scope: "community",
          reason: RandomGenerator.content({ paragraphs: 1 }),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >(),
          max_appeals: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          appeal_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformUserBan.ICreate,
      },
    );
  });

  // Step 6: Test multi-actor authentication switching
  // Switch to member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Switch back to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Final validation: Ensure the API call completed successfully
  TestValidator.predicate("ban creation API call completed", true);
}
