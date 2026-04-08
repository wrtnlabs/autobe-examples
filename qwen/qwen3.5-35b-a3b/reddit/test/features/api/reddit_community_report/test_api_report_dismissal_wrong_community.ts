import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismissal_wrong_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Admin1 who moderates community A
  const admin1Password = RandomGenerator.alphaNumeric(16);
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: admin1Password,
      display_name: "Admin1 for Community A",
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // 2. Setup - Admin2 who moderates community B (NOT community A)
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: admin2Password,
      display_name: "Admin2 for Community B",
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 3. Setup - Member for creating posts and reports
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 4. Member creates a post in community A
  const communityAId = "00000000-0000-0000-0000-000000000001";
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test Post in Community A",
        post_type: "text" as const,
        reddit_community_community_id: communityAId,
        text_content: "This is a test post content for reporting.",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member submits a report on the post
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          reason: "This is a test report reason for validation",
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "report created with pending status",
    report.status_id,
    0,
  );
  // 6. Admin2 attempts to dismiss the report (should fail - doesn't moderate community A)
  // Note: admin2Connection is already authenticated from step 2
  await TestValidator.error(
    "admin2 cannot dismiss report from non-moderated community",
    async () => {
      await api.functional.redditCommunity.admin.reports.dismiss(
        admin2Connection,
        {
          reportId: report.id,
          body: {
            resolution_notes: "Test dismissal attempt",
          } satisfies IRedditCommunityReport.IDismissRequest,
        },
      );
    },
  );
  // 7. Admin1 CAN still dismiss the report (they do moderate community A)
  // Note: admin1Connection is already authenticated from step 1
  const dismissedReport =
    await api.functional.redditCommunity.admin.reports.dismiss(
      admin1Connection,
      {
        reportId: report.id,
        body: {
          resolution_notes: "Valid dismissal by admin who moderates community",
        } satisfies IRedditCommunityReport.IDismissRequest,
      },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "report dismissed successfully by admin1",
    dismissedReport.status_id,
    2,
  );
  // 8. Verify admin2 STILL cannot dismiss the already-dismissed report
  await TestValidator.error(
    "admin2 cannot dismiss already-dismissed report",
    async () => {
      await api.functional.redditCommunity.admin.reports.dismiss(
        admin2Connection,
        {
          reportId: report.id,
          body: {
            resolution_notes: "Another test attempt",
          } satisfies IRedditCommunityReport.IDismissRequest,
        },
      );
    },
  );
}
