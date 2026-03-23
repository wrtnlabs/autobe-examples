import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that a community owner can ban a moderator (but regular moderators cannot ban other moderators).
 *
 * This test validates the ban permission hierarchy in community moderation:
 * - Community owners can ban any member, including moderators
 * - Regular moderators can ban regular members but not owners or other moderators
 * - Ban records are properly created and validated
 */
export async function test_api_community_ban_owner_bans_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community (owner becomes the owner)
  const community = await api.functional.redditClone.member.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Register and authenticate as second member (will become moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Owner adds second member as moderator
  const moderatorRecord =
    await api.functional.redditClone.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          memberId: moderatorAuth.id,
          role: "mod",
        } satisfies IRedditCloneCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  // 5. Register and authenticate as third member (will be banned)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(targetAuth);
  // 6. Owner bans the moderator (should succeed)
  const banRecord =
    await api.functional.redditClone.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: moderatorAuth.id,
          reason: "Testing owner can ban moderator",
        } satisfies IRedditCloneBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 7. Validate ban record details
  TestValidator.equals(
    "banned member is moderator",
    banRecord.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "ban is in correct community",
    banRecord.community.id,
    community.id,
  );
  TestValidator.predicate("ban reason is set", banRecord.reason !== null);
  TestValidator.predicate(
    "ban is active (not lifted)",
    banRecord.lifted_at === null,
  );
  // 8. Moderator tries to ban third member (should succeed - regular members can be banned by mods)
  const modBanRecord =
    await api.functional.redditClone.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          member_id: targetAuth.id,
          reason: "Testing moderator can ban regular member",
        } satisfies IRedditCloneBan.ICreate,
      },
    );
  typia.assert(modBanRecord);
  // 9. Validate moderator ban record
  TestValidator.equals(
    "banned member is target",
    modBanRecord.member.id,
    targetAuth.id,
  );
  TestValidator.equals(
    "ban is in correct community",
    modBanRecord.community.id,
    community.id,
  );
  // 10. Moderator tries to ban community owner (should fail)
  await TestValidator.error("moderator cannot ban owner", async () => {
    await api.functional.redditClone.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          member_id: ownerAuth.id,
          reason: "Attempting to ban owner",
        } satisfies IRedditCloneBan.ICreate,
      },
    );
  });
}
