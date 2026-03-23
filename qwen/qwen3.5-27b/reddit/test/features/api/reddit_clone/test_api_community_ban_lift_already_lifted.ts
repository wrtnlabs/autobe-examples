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
 * Test that attempting to lift a ban that has already been lifted returns a 409 Conflict error.
 * This validates the idempotency protection and prevents confusion about ban status in the audit trail.
 */
export async function test_api_community_ban_lift_already_lifted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner (moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a community
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as a member to be banned and capture their ID
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember: IRedditCloneMember.IAuthorized =
    await authorize_member_join(bannedMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(bannedMember);
  // 4. Create a ban on the member using their actual ID
  const ban: IRedditCloneBan =
    await generate_random_reddit_clone_member_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: bannedMember.id,
          reason: "Test ban for idempotency test",
        },
      },
    );
  typia.assert(ban);
  // 5. First lift - should succeed
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Second lift attempt - should throw 409 Conflict
  await TestValidator.httpError(
    "already lifted ban should return 409 Conflict",
    409,
    async () =>
      await api.functional.redditClone.member.communities.bans.erase(
        moderatorConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      ),
  );
}
