import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
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
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a community moderator can successfully ban a member from the community.
 *
 * 1. Register and authenticate as community owner (member1)
 * 2. Create a community (member1 becomes owner with moderator privileges)
 * 3. Register and authenticate as member2 (who will be banned)
 * 4. As member1, ban member2 from the community
 * 5. Validate the ban record structure and content
 */
export async function test_api_community_ban_moderator_bans_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner (member1)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community (owner becomes moderator)
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
  // 3. Register and authenticate as member2 (who will be banned)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 4. As owner, ban member2 from the community
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await api.functional.redditClone.member.communities.bans.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        member_id: memberAuth.id,
        reason: banReason,
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Validate ban record structure and content
  TestValidator.equals(
    "banned member ID matches",
    ban.member.id,
    memberAuth.id,
  );
  TestValidator.equals("community ID matches", ban.community.id, community.id);
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.predicate("banned_at is valid date-time", () => {
    const date = new Date(ban.banned_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals("lifted_at is null (active ban)", ban.lifted_at, null);
}
