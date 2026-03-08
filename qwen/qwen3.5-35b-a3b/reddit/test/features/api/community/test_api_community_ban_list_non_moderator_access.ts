import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_ban_list_non_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Member 1 creates a community (owner)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  if (member1Connection.headers !== undefined) {
    typia.assert(member1Connection.headers.Authorization);
  }
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
        },
      },
    );
  typia.assert(community);
  // 2. Verify owner can access ban list (positive control)
  const banListFromOwner =
    await api.functional.redditPlatform.communities.bans.index(
      member1Connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(banListFromOwner);
  TestValidator.equals(
    "owner can access ban list",
    banListFromOwner.pagination.records,
    0,
  );
  // 3. Setup: Member 2 joins (NOT a moderator of the community)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  if (member2Connection.headers !== undefined) {
    typia.assert(member2Connection.headers.Authorization);
  }
  // 4. Attempt: Member 2 tries to access ban list (should fail - not moderator or owner)
  await TestValidator.error(
    "non-moderator cannot access ban list",
    async () => {
      await api.functional.redditPlatform.communities.bans.index(
        member2Connection,
        {
          communityId: community.id,
          body: {
            page: 1,
            limit: 20,
          },
        },
      );
    },
  );
  // 5. Verify member2 still cannot access after multiple attempts
  await TestValidator.error("non-moderator consistently blocked", async () => {
    await api.functional.redditPlatform.communities.bans.index(
      member2Connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  });
}