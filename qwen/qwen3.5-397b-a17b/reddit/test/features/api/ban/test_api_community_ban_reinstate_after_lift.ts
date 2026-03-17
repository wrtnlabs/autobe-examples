import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_ban_reinstate_after_lift(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create community (moderator becomes owner)
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create second member account (to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Create ban against the second member
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      body: {
        member_id: bannedMemberAuth.id,
        reason: banReason,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // Verify initial ban is active (deleted_at is null)
  TestValidator.predicate("initial ban is active", ban.deleted_at === null);
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  // 5. Lift the ban by setting deleted_at to current timestamp
  const liftTimestamp = new Date().toISOString();
  const liftedBan =
    await api.functional.redditClone.member.communities.bans.update(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          deleted_at: liftTimestamp,
        } satisfies IRedditCloneBan.IUpdate,
      },
    );
  typia.assert(liftedBan);
  // Verify ban was lifted
  TestValidator.predicate("ban was lifted", liftedBan.deleted_at !== null);
  TestValidator.equals(
    "lifted timestamp matches",
    liftedBan.deleted_at,
    liftTimestamp,
  );
  const liftedUpdatedAt = liftedBan.updated_at;
  // Wait a small amount to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Reinstate the ban by setting deleted_at back to null
  const reinstatedBan =
    await api.functional.redditClone.member.communities.bans.update(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          deleted_at: null,
        } satisfies IRedditCloneBan.IUpdate,
      },
    );
  typia.assert(reinstatedBan);
  // 7. Validate reinstated ban
  TestValidator.predicate(
    "ban reinstated (deleted_at is null)",
    reinstatedBan.deleted_at === null,
  );
  TestValidator.equals("ban reason unchanged", reinstatedBan.reason, banReason);
  TestValidator.predicate(
    "updated_at changed after reinstatement",
    reinstatedBan.updated_at > liftedUpdatedAt,
  );
  TestValidator.equals(
    "member unchanged",
    reinstatedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "community unchanged",
    reinstatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "issuer unchanged",
    reinstatedBan.issuer.id,
    moderatorAuth.id,
  );
  TestValidator.equals("ban id unchanged", reinstatedBan.id, ban.id);
}
