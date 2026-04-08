import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test ban creation by a community moderator (not the owner).
 *
 * Validates that moderators (not just community owners) have the authority to issue bans within their community. The test establishes a complete moderation workflow: community creation, moderator assignment, and ban enforcement by the assigned moderator.
 *
 * The test scenario creates three distinct member accounts with different roles: the community owner who establishes the community and assigns moderators, a moderator who exercises ban authority, and a target member who receives the ban. This demonstrates the delegation of moderation powers within the community hierarchy.
 *
 * 1. Member A authenticates and creates a new community, becoming the owner.
 * 2. Member B authenticates as a separate user account.
 * 3. Member C authenticates as the target user to be banned.
 * 4. Member A (owner) adds Member B as a moderator to the community.
 * 5. Member B (moderator) creates a ban against Member C with active status.
 * 6. Validates the ban record shows Member B as the issuer, confirming moderator ban authority.
 */
export async function test_api_community_ban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community owned by Member A
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Authenticate as Member B (moderator to be assigned)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Authenticate as Member C (target to be banned)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetAuth);
  // 5. As Member A (owner), add Member B as moderator
  const moderatorAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: moderatorAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 6. As Member B (moderator), create ban against Member C
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      moderatorConnection,
      {
        body: {
          reddit_community_member_id: targetAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // 7. Validate ban record shows Member B as issuer
  TestValidator.equals(
    "ban issuer is moderator",
    ban.issuer.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "ban issuer username",
    ban.issuer.username,
    moderatorAuth.username,
  );
  TestValidator.equals("banned member is target", ban.member.id, targetAuth.id);
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals(
    "ban applies to correct community",
    ban.community.id,
    community.id,
  );
  TestValidator.predicate("ban has valid reason", ban.reason.length > 0);
}
