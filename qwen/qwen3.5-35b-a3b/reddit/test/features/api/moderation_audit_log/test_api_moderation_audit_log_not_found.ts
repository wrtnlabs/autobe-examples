import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_member_communities_bans_ban";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_moderation_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create member accounts as community owners
  const owner1Connection: api.IConnection = { host: connection.host };
  const owner1Auth = await authorize_member_join(owner1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner1Auth);
  const owner2Connection: api.IConnection = { host: connection.host };
  const owner2Auth = await authorize_member_join(owner2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner2Auth);
  // Create communities owned by each owner
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      owner1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      owner2Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Assign moderators to each community
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1Auth = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderator1Auth);
  // Assign moderator to community1
  const moderatorToAdd1: IRedditPlatformCommunityModerator =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      owner1Connection,
      {
        communityId: community1.id,
        userId: moderator1Auth.user.id,
      },
    );
  typia.assert(moderatorToAdd1);
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2Auth = await authorize_member_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderator2Auth);
  // Assign moderator to community2
  const moderatorToAdd2: IRedditPlatformCommunityModerator =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      owner2Connection,
      {
        communityId: community2.id,
        userId: moderator2Auth.user.id,
      },
    );
  typia.assert(moderatorToAdd2);
  // Create users to ban in each community
  const userToBan1Connection: api.IConnection = { host: connection.host };
  const userToBan1Auth = await authorize_member_join(userToBan1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(userToBan1Auth);
  const userToBan2Connection: api.IConnection = { host: connection.host };
  const userToBan2Auth = await authorize_member_join(userToBan2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(userToBan2Auth);
  // Perform ban actions as moderators to generate audit logs
  const ban1 =
    await generate_random_reddit_platform_member_communities_bans_ban(
      moderator1Connection,
      {
        body: {
          expiresAt: null,
          userId: userToBan1Auth.user.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
        params: {
          communityId: community1.id,
          userId: userToBan1Auth.user.id,
        },
      },
    );
  typia.assert(ban1);
  const ban2 =
    await generate_random_reddit_platform_member_communities_bans_ban(
      moderator2Connection,
      {
        body: {
          expiresAt: null,
          userId: userToBan2Auth.user.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
        params: {
          communityId: community2.id,
          userId: userToBan2Auth.user.id,
        },
      },
    );
  typia.assert(ban2);
  // Test 1: Invalid logId that doesn't exist
  await TestValidator.httpError(
    "invalid logId should return 404",
    404,
    async () => {
      const fakeLogId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.redditPlatform.member.communities.moderation_audit_logs.at(
        moderator1Connection,
        {
          communityId: community1.id,
          logId: fakeLogId,
        },
      );
    },
  );
  // Test 2: Valid logId from different community (cross-community)
  await TestValidator.httpError(
    "logId from different community should return 404",
    404,
    async () => {
      await api.functional.redditPlatform.member.communities.moderation_audit_logs.at(
        moderator1Connection,
        {
          communityId: community2.id,
          logId: ban1.id,
        },
      );
    },
  );
  // Test 3: Simulated soft-deleted log (using invalid logId to simulate non-existent)
  // Since we cannot directly delete logs in E2E tests, we test with a non-existent logId
  await TestValidator.httpError(
    "non-existent log should return 404",
    404,
    async () => {
      const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.redditPlatform.member.communities.moderation_audit_logs.at(
        moderator2Connection,
        {
          communityId: community2.id,
          logId: nonExistentLogId,
        },
      );
    },
  );
}
