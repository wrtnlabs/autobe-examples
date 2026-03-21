import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserKarma";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_user_karma } from "../../../prepare/prepare_random_reddit_clone_user_karma";

export async function test_api_community_banned_users_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member1 (community owner) via authorize_member_join
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `owner_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // 2. Register member2 (violator who will be banned) via authorize_member_join
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `violator_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // 3. Create community owned by member1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Ban member2 from the community with reason='spam'
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    member1Connection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: member2.username,
        reason: "spam",
      },
    },
  );
  typia.assert(ban);
  // 5. Query bans via PATCH /member/communities/{communityName}/bans
  const bansResponse =
    await api.functional.redditClone.member.communities.bans.index(
      member1Connection,
      {
        communityName: community.name,
        body: {} satisfies IRedditCloneUserKarma.IRequest,
      },
    );
  typia.assert(bansResponse);
  // Validate response
  TestValidator.equals("pagination exists", !!bansResponse.pagination, true);
  TestValidator.predicate("records >= 1", bansResponse.pagination.records >= 1);
  TestValidator.predicate("data array has bans", bansResponse.data.length >= 1);
  // Find the ban record for member2
  const member2Ban = bansResponse.data.find(
    (b) => b.bannedUser.username === member2.username,
  );
  TestValidator.equals(
    "member2 ban exists",
    member2Ban !== null && member2Ban !== undefined,
    true,
  );
  if (member2Ban) {
    TestValidator.equals("reason matches", member2Ban.reason, "spam");
    TestValidator.equals(
      "issuer is member1",
      member2Ban.issuer.username,
      member1.username,
    );
    TestValidator.equals(
      "community name matches",
      member2Ban.community.name,
      community.name,
    );
  }
}
