import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBan";
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

/**
 * Test that the ban list endpoint returns only currently active bans
 * and excludes users whose bans have been lifted.
 *
 * 1. Moderator registers and creates a community
 * 2. Create two member accounts to be banned
 * 3. Ban both members from the community
 * 4. Lift (unban) one of the members
 * 5. Retrieve ban list and verify only the active ban appears
 * 6. Validate that unbanned user is not in the results
 */
export async function test_api_community_ban_list_active_only(
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
  // 2. Create community where moderator has authority
  const community = await api.functional.redditClone.communities.create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create first member account to be banned (will remain banned)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
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
  typia.assert(member1Auth);
  // 4. Create second member account to be banned then unbanned
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
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
  typia.assert(member2Auth);
  // 5. Ban first member from community (this ban will remain active)
  const ban1 = await api.functional.redditClone.member.communities.bans.create(
    moderatorConnection,
    {
      communityId: community.id,
      body: {
        member_id: member1Auth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban1);
  // 6. Ban second member from community (this ban will be lifted)
  const ban2 = await api.functional.redditClone.member.communities.bans.create(
    moderatorConnection,
    {
      communityId: community.id,
      body: {
        member_id: member2Auth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban2);
  // 7. Lift ban on second member (unban)
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban2.id,
    },
  );
  // 8. Retrieve ban list - should only contain active bans
  const banList =
    await api.functional.redditClone.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
        } satisfies IRedditCloneBan.IRequest,
      },
    );
  typia.assert(banList);
  // 9. Validate ban list contains only active bans
  TestValidator.equals("ban list count", banList.data.length, 1);
  TestValidator.equals(
    "only member1 is in ban list",
    banList.data[0].member.id,
    member1Auth.id,
  );
  TestValidator.predicate(
    "ban reason matches",
    banList.data[0].reason === ban1.reason,
  );
  // 10. Verify unbanned member is not in the list
  const unbannedMemberFound = banList.data.some(
    (ban) => ban.member.id === member2Auth.id,
  );
  TestValidator.predicate("unbanned member not in list", !unbannedMemberFound);
}
