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

export async function test_api_community_banned_users_filtered_by_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "owner_" + RandomGenerator.alphabets(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register member1 (username contains 'john')
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "john_doe_" + RandomGenerator.alphabets(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Register member2 (username contains 'jane')
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "jane_smith_" + RandomGenerator.alphabets(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Register member3 (username contains 'alice')
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "alice_wonder_" + RandomGenerator.alphabets(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: "test_comm_" + RandomGenerator.alphabets(6),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // 6. Ban all three members
  await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: member1.username,
        reason: "Violation of community rules - john",
      },
    },
  );
  await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: member2.username,
        reason: "Violation of community rules - jane",
      },
    },
  );
  await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: member3.username,
        reason: "Violation of community rules - alice",
      },
    },
  );
  // 7. Query bans with usernameSearch='john' filter
  const filteredBans =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          usernameSearch: "john",
        } satisfies IRedditCloneUserKarma.IRequest,
      },
    );
  typia.assert(filteredBans);
  // Validate: Only member1 (with 'john' in username) should be returned
  TestValidator.equals(
    "should return exactly 1 ban",
    filteredBans.data.length,
    1,
  );
  TestValidator.equals(
    "banned username contains john",
    filteredBans.data[0].bannedUser.username,
    member1.username,
  );
  // Test pagination: records count should reflect filtered results
  TestValidator.predicate(
    "pagination records matches filtered count",
    filteredBans.pagination.records === 1,
  );
  // 8. Test issuedByUsername filter (owner issued all bans, so filter by owner username)
  const bansByOwner =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          issuedByUsername: owner.username,
        } satisfies IRedditCloneUserKarma.IRequest,
      },
    );
  typia.assert(bansByOwner);
  // All 3 bans were issued by owner, so all should be returned
  TestValidator.equals(
    "should return all 3 bans issued by owner",
    bansByOwner.data.length,
    3,
  );
  TestValidator.predicate(
    "pagination records matches total bans",
    bansByOwner.pagination.records === 3,
  );
}
