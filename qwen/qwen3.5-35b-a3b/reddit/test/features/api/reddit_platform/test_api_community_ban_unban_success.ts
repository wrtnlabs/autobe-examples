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
import { generate_random_reddit_platform_admin_communities_bans_create } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

/**
 * Test successful unban of a user from a Reddit community by admin.
 * This scenario verifies the complete unban workflow:
 * 1. Admin joins system
 * 2. Admin creates a community
 * 3. Member joins system
 * 4. Admin bans the member from the community
 * 5. Admin performs unban operation
 * 6. Verify ban record has deletedAt set
 * 7. Verify ban response structure is correct
 */
export async function test_api_community_ban_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Create community by admin
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 4. Admin bans the member
  const ban = await api.functional.redditPlatform.admin.communities.bans.create(
    adminConnection,
    {
      communityId: community.id,
      body: {
        userId: memberAuth.user.id,
      } satisfies IRedditPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Verify ban is active (deletedAt should be null before unban)
  typia.assert(ban.deletedAt === null);
  // 6. Admin unban the member
  const unbanResponse =
    await api.functional.redditPlatform.admin.communities.bans.putByCommunityidAndBanid(
      adminConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          unbanReason: "Test unban - privileges restored",
        } satisfies IRedditPlatformCommunityBan.IUnban,
      },
    );
  typia.assert(unbanResponse);
  // 7. Verify unban worked - deletedAt should be set to current timestamp
  TestValidator.predicate(
    "unban deletedAt is set",
    unbanResponse.deletedAt !== null && unbanResponse.deletedAt !== undefined,
  );
  // 8. Verify community reference in unban response
  TestValidator.equals(
    "unban response community matches created community",
    unbanResponse.community.id,
    community.id,
  );
  // 9. Verify banned user reference in unban response
  TestValidator.equals(
    "unban response banned user matches member",
    unbanResponse.author.id,
    memberAuth.user.id,
  );
  // 10. Verify ban ID in response matches the one we unbanned
  TestValidator.equals(
    "unban response id matches original ban id",
    unbanResponse.id,
    ban.id,
  );
}
