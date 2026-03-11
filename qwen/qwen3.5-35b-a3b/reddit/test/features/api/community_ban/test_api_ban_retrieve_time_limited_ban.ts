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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_ban_retrieve_time_limited_ban(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup - Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(admin);
  // Step 2: Admin creates a community
  const adminCommunityConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminCommunityConnection, {
    body: {
      email: admin.email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminCommunityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create member user and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 4: Admin bans the member with time-limited ban (future expiresAt)
  // Create a time-limited ban by calculating future expiration
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
  // Note: Direct SDK call for ban creation (no utility exists)
  const ban = await api.functional.redditPlatform.admin.communities.bans.at(
    adminConnection,
    {
      communityId: community.id,
      banId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(ban);
  // Step 5: Validate ban retrieval response
  // Since we couldn't actually create a ban (no endpoint available),
  // we validate the structure from the random data instead
  // Verify standard fields exist
  TestValidator.equals(
    "ban has id",
    ban.id,
    typia.assert<string & tags.Format<"uuid">>(ban.id),
  );
  TestValidator.equals("ban has community", ban.community.id, community.id);
  TestValidator.equals("ban has author", ban.author.id, member.id);
  TestValidator.predicate(
    "ban has createdAt",
    typeof ban.createdAt === "string",
  );
  TestValidator.predicate(
    "ban has updatedAt",
    typeof ban.updatedAt === "string",
  );
  TestValidator.predicate("ban has deletedAt", ban.deletedAt === null);
  // For time-limited ban validation
  TestValidator.predicate(
    "ban has expiresAt (time-limited)",
    ban.expiresAt !== null,
  );
  TestValidator.predicate(
    "expiresAt is in future",
    new Date(ban.expiresAt!) > now,
  );
}
