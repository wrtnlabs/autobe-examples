import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test community owner banning a member from their community.
 *
 * Validates the complete community ban workflow including owner registration and authentication, community creation with owner as creator granting automatic moderator authority, target member registration, and the ban operation. Ensures that the ban record is successfully created with correct references to the community, banned member, and moderating owner. The ban reason text is verified to be recorded correctly.
 *
 * The owner automatically gains moderator authority upon creating the community, which allows them to ban other members. This authority is established through the community creation process where the authenticated user becomes the creator and highest authority owner. The ban restricts the target member from creating posts and comments in that community while preserving their read access.
 *
 * 1. Owner registers with email and credentials using the member join utility.
 * 2. Owner creates a community with unique name and description.
 * 3. Target member registers with email and credentials using the member join utility.
 * 4. Owner bans the target member from the community with a ban reason.
 * 5. Validates that the ban record contains correct community and member references.
 * 6. Validates that the ban reason is recorded correctly.
 */
export async function test_api_community_ban_owner_bans_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(8),
      href: "",
      referrer: "",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<string>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Target member registers and authenticates - capture member id from response
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuth = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(8),
      href: "",
      referrer: "",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(targetMemberAuth);
  // 4. Owner bans the target member from the community
  const ban =
    await api.functional.redditLikeCommunity.member.communities.community_bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: targetMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Validate ban record contains correct community reference
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals(
    "ban community name matches",
    ban.community.name,
    community.name,
  );
  // 6. Validate ban record contains correct banned member reference
  TestValidator.equals(
    "ban member matches",
    ban.member.id,
    targetMemberAuth.id,
  );
  TestValidator.equals(
    "ban member username matches",
    ban.member.username,
    targetMemberAuth.username,
  );
  // 7. Validate ban moderator reference points to the owner (who has authority)
  TestValidator.equals(
    "ban moderator is owner",
    ban.moderator.member.id,
    ownerAuth.id,
  );
  // 8. Validate ban reason is recorded
  TestValidator.predicate("ban reason recorded", ban.reason.length > 0);
  // 9. Validate ban is active (not deleted)
  TestValidator.equals("ban is active", ban.deleted_at, null);
}