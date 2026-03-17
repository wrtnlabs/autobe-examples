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

export async function test_api_community_ban_reason_update_by_moderator(
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
  // 3. Create second member account to be banned
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
  // 4. Create initial ban with original reason
  const initialReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      body: {
        member_id: bannedMemberAuth.id,
        reason: initialReason,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // Store original timestamps for comparison
  const originalCreatedAt = ban.created_at;
  const originalUpdatedAt = ban.updated_at;
  // 5. Update ban reason using PUT endpoint
  const updatedReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedBan =
    await api.functional.redditClone.member.communities.bans.update(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          reason: updatedReason,
        } satisfies IRedditCloneBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate the updated ban
  TestValidator.equals(
    "reason matches updated value",
    updatedBan.reason,
    updatedReason,
  );
  TestValidator.equals("ban id unchanged", updatedBan.id, ban.id);
  TestValidator.equals(
    "member unchanged",
    updatedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "issuer unchanged",
    updatedBan.issuer.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBan.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedBan.updated_at > originalUpdatedAt,
  );
  TestValidator.equals("deleted_at remains null", updatedBan.deleted_at, null);
}
