import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderation_audit_logs_cross_community_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Store original credentials for login
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(12);
  // 1. Create Admin 1
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: admin1Email,
      username: RandomGenerator.alphaNumeric(10),
      password: admin1Password,
    },
  });
  typia.assert(admin1Auth);
  // Login Admin 1
  const admin1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(admin1LoginConnection, {
    body: {
      email: admin1Email,
      password: admin1Password,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Create Community A owned by Admin 1
  const communityA =
    await generate_random_reddit_platform_member_communities_create(
      admin1LoginConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 2. Create Member 1 (future moderator of Community A)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: member1Password,
    },
  });
  typia.assert(member1Auth);
  // Make Member 1 moderator of Community A
  const mod1Assignment =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      admin1LoginConnection,
      {
        communityId: communityA.id,
        userId: member1Auth.id,
      },
    );
  typia.assert(mod1Assignment);
  // 3. Create Admin 2
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: admin2Email,
      username: RandomGenerator.alphaNumeric(10),
      password: admin2Password,
    },
  });
  typia.assert(admin2Auth);
  // Login Admin 2
  const admin2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(admin2LoginConnection, {
    body: {
      email: admin2Email,
      password: admin2Password,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Create Community B owned by Admin 2
  const communityB =
    await generate_random_reddit_platform_member_communities_create(
      admin2LoginConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 4. Create Member 2 (future moderator of Community B)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: member2Password,
    },
  });
  typia.assert(member2Auth);
  // Make Member 2 moderator of Community B
  const mod2Assignment =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      admin2LoginConnection,
      {
        communityId: communityB.id,
        userId: member2Auth.id,
      },
    );
  typia.assert(mod2Assignment);
  // 5. Login Member 1 (moderator of Community A only)
  const member1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member1LoginConnection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // Login Member 2 (moderator of Community B only)
  const member2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member2LoginConnection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 6. Verify Member 1 (moderator of Community A) CANNOT access Community B audit logs
  await TestValidator.error(
    "member1 cannot access communityB audit logs",
    async () => {
      await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
        member1LoginConnection,
        {
          communityId: communityB.id,
          body: {},
        },
      );
    },
  );
  // 7. Verify Member 2 (moderator of Community B) CANNOT access Community A audit logs
  await TestValidator.error(
    "member2 cannot access communityA audit logs",
    async () => {
      await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
        member2LoginConnection,
        {
          communityId: communityA.id,
          body: {},
        },
      );
    },
  );
  // 8. Verify Member 1 (moderator of Community A) CAN access Community A audit logs
  const auditLogsA =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      member1LoginConnection,
      {
        communityId: communityA.id,
        body: {},
      },
    );
  typia.assert(auditLogsA);
  TestValidator.equals("member1 can access communityA audit logs", true, true);
  // 9. Verify Member 2 (moderator of Community B) CAN access Community B audit logs
  const auditLogsB =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      member2LoginConnection,
      {
        communityId: communityB.id,
        body: {},
      },
    );
  typia.assert(auditLogsB);
  TestValidator.equals("member2 can access communityB audit logs", true, true);
}
