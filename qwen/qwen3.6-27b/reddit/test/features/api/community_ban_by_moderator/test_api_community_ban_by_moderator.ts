import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_bans_create";
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test that a newly appointed moderator can ban a target member from their community.
 *
 * Validates the complete community ban workflow: the community owner creates a community and appoints a member as a moderator, then the moderator uses their authority to ban another member from participating in the community.
 *
 * Special attention is given to verifying that the ban record correctly attributes the moderation action, including the banned member, the issuing moderator, and the community context.
 *
 * 1. Register the target member who will be banned.
 * 2. Register the user who will be appointed as a moderator.
 * 3. Register the community owner.
 * 4. Owner creates a community.
 * 5. Owner appoints the user as a moderator of the community.
 * 6. Moderator (using authenticated session) bans the target member.
 * 7. Validates ban details match input and the correct moderator is attributed.
 */
export async function test_api_community_ban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register target member (will be banned)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(targetMember);
  // 2. Register moderator-to-be (authentication persists on this connection)
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMemberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  };
  const moderatorMember = await authorize_member_join(
    moderatorMemberConnection,
    {
      body: moderatorMemberInput,
    },
  );
  typia.assert(moderatorMember);
  // 3. Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMemberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  };
  const ownerMember = await authorize_member_join(ownerConnection, {
    body: ownerMemberInput,
  });
  typia.assert(ownerMember);
  // 4. Owner creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 5. Owner appoints user as moderator
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        body: { member_id: moderatorMember.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(moderatorAssignment);
  // 6. Moderator (already authenticated) bans the target member
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banBody = {
    member_id: targetMember.id,
    reason: banReason,
  } satisfies IREdditLikeCommunityCommunityBan.ICreate;
  const ban =
    await generate_random_reddit_like_community_member_communities_bans_create(
      moderatorMemberConnection,
      {
        body: banBody,
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // 7. Validate ban details
  TestValidator.equals(
    "banned member matches target",
    ban.member.id,
    targetMember.id,
  );
  TestValidator.equals(
    "banned member username matches target",
    ban.member.username,
    targetMember.username,
  );
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.equals(
    "moderator matches issuing user",
    ban.moderator.member.id,
    moderatorMember.id,
  );
  TestValidator.equals("ban reason matches input", ban.reason, banReason);
  TestValidator.equals("ban is active (not deleted)", ban.deleted_at, null);
}
