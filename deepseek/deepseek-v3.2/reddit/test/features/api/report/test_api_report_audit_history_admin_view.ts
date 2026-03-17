import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { ICommunityPlatformUserReportHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReportHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserReportHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReportHistory";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_audit_history_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Reporter member setup
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(reporter);
  // 3. Admin creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Admin subscribes to community to enable posting
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      adminConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Admin creates post
  const post = await generate_random_community_platform_member_posts_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Reporter submits report against the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Admin retrieves audit history
  const history =
    await api.functional.communityPlatform.admin.reports.history.index(
      adminConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(history);
  // 8. Validate pagination structure
  TestValidator.predicate(
    "history has pagination",
    () => history.pagination !== undefined,
  );
  TestValidator.predicate("history has data array", () =>
    Array.isArray(history.data),
  );
  TestValidator.predicate(
    "pagination has required fields",
    () =>
      typeof history.pagination.current === "number" &&
      typeof history.pagination.limit === "number" &&
      typeof history.pagination.records === "number" &&
      typeof history.pagination.pages === "number",
  );
  // 9. Validate each audit entry has required fields
  if (history.data.length > 0) {
    for (const entry of history.data) {
      typia.assert(entry);
      TestValidator.predicate("entry has id", () => entry.id !== undefined);
      TestValidator.predicate(
        "entry has action_type",
        () => entry.action_type !== undefined,
      );
      TestValidator.predicate(
        "entry has actor_type",
        () => entry.actor_type !== undefined,
      );
      TestValidator.predicate(
        "entry has actor",
        () => entry.actor !== undefined,
      );
      TestValidator.predicate(
        "entry has created_at",
        () => entry.created_at !== undefined,
      );
      TestValidator.predicate(
        "entry has user_report",
        () => entry.user_report !== undefined,
      );
      // Validate actor can be member or string
      if (entry.actor_type === "moderator" || entry.actor_type === "user") {
        TestValidator.predicate(
          "actor is member summary",
          () =>
            (entry.actor as ICommunityPlatformMember.ISummary).id !== undefined,
        );
      } else if (entry.actor_type === "system") {
        TestValidator.predicate(
          "actor is string",
          () => typeof entry.actor === "string",
        );
      }
      // Validate user_report structure
      TestValidator.predicate(
        "user_report has id",
        () => entry.user_report.id !== undefined,
      );
      TestValidator.predicate(
        "user_report has reason",
        () => entry.user_report.reason !== undefined,
      );
      TestValidator.predicate(
        "user_report has status",
        () => entry.user_report.status !== undefined,
      );
      TestValidator.predicate(
        "user_report has community",
        () => entry.user_report.community !== undefined,
      );
      TestValidator.predicate(
        "user_report has reporter",
        () => entry.user_report.reporter !== undefined,
      );
    }
    // 10. Validate chronological sorting (most recent first)
    if (history.data.length > 1) {
      for (let i = 0; i < history.data.length - 1; i++) {
        const current = new Date(history.data[i].created_at);
        const next = new Date(history.data[i + 1].created_at);
        TestValidator.predicate(
          "entries sorted descending",
          () => current >= next,
        );
      }
    }
  }
  // 11. Verify at least 'created' action type exists for report creation
  if (history.data.length > 0) {
    const hasCreatedAction = history.data.some(
      (entry) => entry.action_type === "created",
    );
    TestValidator.predicate("has created action type", () => hasCreatedAction);
  }
}
