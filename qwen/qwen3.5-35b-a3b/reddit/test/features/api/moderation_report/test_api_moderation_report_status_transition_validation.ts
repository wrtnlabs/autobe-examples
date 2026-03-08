import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderation_report_status_transition_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin: IRedditPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(adminJoin);
  // 2. Join community owner member
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerJoin: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(ownerJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(ownerJoin);
  // 3. Login as owner to create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditPlatformMember.IAuthorized = await authorize_member_login(
    ownerConnection,
    {
      body: {
        email: ownerJoin.email,
        password: ownerJoin.token.access,
      } satisfies IRedditPlatformMember.ILogin,
    },
  );
  typia.assert(owner);
  // 4. Create community as owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Login as admin to moderate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminJoin.token.access,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 6. Add admin as moderator to community
  const moderatorAppointment =
    await api.functional.redditPlatform.member.communities.moderators.add(
      ownerConnection,
      {
        communityId: community.id,
        body: { user_id: adminJoin.id },
      },
    );
  typia.assert(moderatorAppointment);
  // 7. Join member1 for posting
  const member1JoinConnection: api.IConnection = { host: connection.host };
  const member1Join: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(member1JoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(member1Join);
  // 8. Login as member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IRedditPlatformMember.IAuthorized =
    await authorize_member_login(member1Connection, {
      body: {
        email: member1Join.email,
        password: member1Join.token.access,
      } satisfies IRedditPlatformMember.ILogin,
    });
  typia.assert(member1);
  // 9. Member1 creates a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 10. Join member2 for reporting
  const member2JoinConnection: api.IConnection = { host: connection.host };
  const member2Join: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(member2JoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(member2Join);
  // 11. Login as member2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: IRedditPlatformMember.IAuthorized =
    await authorize_member_login(member2Connection, {
      body: {
        email: member2Join.email,
        password: member2Join.token.access,
      } satisfies IRedditPlatformMember.ILogin,
    });
  typia.assert(member2);
  // 12. Member2 submits first report (PENDING)
  const report1 = await api.functional.redditPlatform.member.reports.create(
    member2Connection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: "This post violates community guidelines",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  // 13. Admin approves first report (status -> RESOLVED)
  const approvedReport1 =
    await api.functional.redditPlatform.admin.reports.updateStatus(
      adminConnection,
      {
        reportId: report1.id,
        body: { status: "RESOLVED" },
      },
    );
  typia.assert(approvedReport1);
  TestValidator.equals(
    "report1 status is RESOLVED",
    approvedReport1.status,
    "RESOLVED",
  );
  // 14. Member2 submits second report (PENDING)
  const report2 = await api.functional.redditPlatform.member.reports.create(
    member2Connection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: "Another violation of community guidelines",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  // 15. Test: Update second report status from PENDING to RESOLVED (should succeed)
  const updatedReport2 =
    await api.functional.redditPlatform.admin.reports.updateStatus(
      adminConnection,
      {
        reportId: report2.id,
        body: { status: "RESOLVED" },
      },
    );
  typia.assert(updatedReport2);
  TestValidator.equals(
    "report2 status is now RESOLVED",
    updatedReport2.status,
    "RESOLVED",
  );
  // 16. Test: Attempt to update the same report2 again to RESOLVED (should fail - not PENDING)
  await TestValidator.error(
    "cannot update report that is not in PENDING state",
    async () => {
      await api.functional.redditPlatform.admin.reports.updateStatus(
        adminConnection,
        {
          reportId: report2.id,
          body: { status: "RESOLVED" },
        },
      );
    },
  );
  // 17. Join member3 for third report
  const member3JoinConnection: api.IConnection = { host: connection.host };
  const member3Join: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(member3JoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(member3Join);
  // 18. Login as member3
  const member3Connection: api.IConnection = { host: connection.host };
  const member3: IRedditPlatformMember.IAuthorized =
    await authorize_member_login(member3Connection, {
      body: {
        email: member3Join.email,
        password: member3Join.token.access,
      } satisfies IRedditPlatformMember.ILogin,
    });
  typia.assert(member3);
  // 19. Member3 submits third report (PENDING)
  const report3 = await api.functional.redditPlatform.member.reports.create(
    member3Connection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.id,
        reason: "Third report for validation",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report3);
  // 20. Admin approves third report (status -> RESOLVED)
  const approvedReport3 =
    await api.functional.redditPlatform.admin.reports.updateStatus(
      adminConnection,
      {
        reportId: report3.id,
        body: { status: "RESOLVED" },
      },
    );
  typia.assert(approvedReport3);
  TestValidator.equals(
    "report3 status is RESOLVED",
    approvedReport3.status,
    "RESOLVED",
  );
  // 21. Test: Attempt to update approved report3 to DISMISSED (should fail - not PENDING)
  await TestValidator.error(
    "cannot update report with status RESOLVED to DISMISSED",
    async () => {
      await api.functional.redditPlatform.admin.reports.updateStatus(
        adminConnection,
        {
          reportId: report3.id,
          body: { status: "DISMISSED" },
        },
      );
    },
  );
}
