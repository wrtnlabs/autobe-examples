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

export async function test_api_community_ban_lift_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
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
      },
    },
  );
  typia.assert(community);
  // 3. Create member to be banned
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
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(ban);
  // Store original ban data for comparison
  const originalCreatedAt = ban.created_at;
  const originalReason = ban.reason;
  const originalDeletedAt = ban.deleted_at;
  // Verify ban was initially active (deleted_at is null)
  TestValidator.equals("ban initially active", originalDeletedAt, null);
  // 5. Lift the ban by setting deleted_at to current timestamp
  const liftedBan =
    await api.functional.redditClone.member.communities.bans.update(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies IRedditCloneBan.IUpdate,
      },
    );
  typia.assert(liftedBan);
  // 6. Validate ban lift
  TestValidator.predicate(
    "ban deleted_at is set",
    liftedBan.deleted_at !== null,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(liftedBan.updated_at) >= new Date(originalCreatedAt),
  );
  TestValidator.equals("reason unchanged", liftedBan.reason, originalReason);
  TestValidator.equals("member unchanged", liftedBan.member.id, ban.member.id);
  TestValidator.equals(
    "community unchanged",
    liftedBan.community.id,
    ban.community.id,
  );
  TestValidator.equals("issuer unchanged", liftedBan.issuer.id, ban.issuer.id);
}
