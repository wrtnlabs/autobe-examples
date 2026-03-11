import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_ban_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin@1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Member account (will become community owner)
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwnerAuth = await authorize_member_login(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Member@1234",
      } satisfies IRedditPlatformMember.ILogin,
    },
  );
  typia.assert(communityOwnerAuth);
  // 3. Create community by community owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Banned user account
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_login(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Banned@1234",
    } satisfies IRedditPlatformMember.ILogin,
  });
  typia.assert(bannedUserAuth);
  // 5. Admin bans banned user from community
  const banRecord =
    await api.functional.redditPlatform.member.communities.bans.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          userId: bannedUserAuth.id,
          expiresAt: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 6. Admin retrieves the ban record
  const retrievedBan =
    await api.functional.redditPlatform.admin.communities.bans.at(
      adminConnection,
      {
        communityId: community.id,
        banId: banRecord.id,
      },
    );
  typia.assert(retrievedBan);
  // 7. Validate ban record structure and business logic
  TestValidator.equals("ban id matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned user id matches",
    retrievedBan.author.id,
    bannedUserAuth.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "deletedAt is null for active ban",
    retrievedBan.deletedAt,
    null,
  );
  TestValidator.equals(
    "expiresAt is null for permanent ban",
    retrievedBan.expiresAt,
    null,
  );
  TestValidator.predicate(
    "createdAt is valid timestamp",
    retrievedBan.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is valid timestamp",
    retrievedBan.updatedAt !== undefined,
  );
}
