import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that a moderator can successfully ban a member from their community.
 *
 * Validates the complete community ban creation workflow including moderator authentication, member registration, moderator assignment to community, and ban enforcement. Ensures that the ban record correctly references the banned member, banning moderator, and community, and that all required fields are properly populated.
 *
 * Special attention is given to verifying that the ban reason is preserved, the ban is active (not deleted), and the response includes complete nested information about all related entities.
 *
 * 1. Moderator registers and authenticates with email, password, and profile.
 * 2. Member registers to be banned with email, password, and username.
 * 3. Community is created (simulated with random UUID for testing).
 * 4. Moderator is assigned to the community with 'moderator' role.
 * 5. Moderator creates a ban for the member with a clear ban reason.
 * 6. Validates ban response contains all required fields and nested entity information.
 */
export async function test_api_community_ban_create_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 2. Setup: Register member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Setup: Create community (simulated with random UUID)
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  // 4. Setup: Assign moderator to community
  await generate_random_reddit_clone_moderator_communities_moderators_create(
    moderatorConnection,
    {
      params: { communityId },
      body: {
        userProfileId: moderator.reddit_clone_user_profile_id,
        role: "moderator",
      },
    },
  );
  // 5. Execution: Create ban for member
  const ban =
    await generate_random_reddit_clone_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          reddit_clone_member_id: member.id,
          ban_reason:
            "Repeated violation of community guidelines - spam posting",
          expires_at: null,
        },
      },
    );
  typia.assert(ban);
  // 6. Validation: Verify ban response structure and content
  TestValidator.equals(
    "ban reason matches input",
    ban.banReason,
    "Repeated violation of community guidelines - spam posting",
  );
  TestValidator.equals(
    "banned member ID matches",
    ban.bannedMember.id,
    member.id,
  );
  TestValidator.equals(
    "banning moderator ID matches",
    ban.banningModerator.id,
    moderator.id,
  );
  TestValidator.equals("community ID matches", ban.community.id, communityId);
  TestValidator.equals("ban is active (not deleted)", ban.deletedAt, null);
  TestValidator.predicate(
    "ban has expiration set to null (permanent)",
    ban.expiresAt === null,
  );
  TestValidator.predicate(
    "createdAt timestamp exists",
    ban.createdAt !== undefined && ban.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    ban.updatedAt !== undefined && ban.updatedAt !== null,
  );
}
