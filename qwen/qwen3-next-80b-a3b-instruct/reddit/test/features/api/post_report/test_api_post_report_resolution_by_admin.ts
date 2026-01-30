import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import type { ICommunityBbsPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostStatus";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_post_report } from "../../../prepare/prepare_random_community_bbs_post_report";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post_status } from "../../../prepare/prepare_random_community_bbs_post_status";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_admin_post_statuses_create } from "../../../generate/generate_random_community_bbs_admin_post_statuses_create";
import { generate_random_community_bbs_member_post_reports_create } from "../../../generate/generate_random_community_bbs_member_post_reports_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_post_report_resolution_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Create post status code for reporting (admin action)
  const postStatus =
    await generate_random_community_bbs_admin_post_statuses_create(
      adminConnection,
      {
        body: {
          name: "Violation Report",
          code: "VRPT",
          color: "#FF0000",
        } satisfies ICommunityBbsPostStatus.ICreate,
      },
    );
  // Create community (member action)
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Test Community",
          description: "Community for testing post reports",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post (member action)
  const post = typia.assert(await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Post for Reporting",
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  ));
  // Submit report (member action)
  const reportResponse = await generate_random_community_bbs_member_post_reports_create(
    memberConnection,
    {
      body: {
        target_post_id: post.id,
        selected_violation_category_id: "some-category-id",
        comment: "This post contains inappropriate content",
      } satisfies ICommunityBbsPostReport.ICreate,
    },
  );
  const report = typia.assert<ICommunityBbsPostReport>(reportResponse);
  // Admin resolves report (admin action)
  const resolution =
    await api.functional.communityBbs.admin.post_reports.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          resolution_notes:
            "Report resolved: Violation of community guidelines.",
          status: "resolved",
        } satisfies ICommunityBbsPostReport.IUpdate,
      },
    );
  typia.assert(resolution);
  // Validate resolution
  TestValidator.equals(
    "status changed to resolved",
    resolution.status,
    "resolved",
  );
  TestValidator.predicate(
    "resolved_at is set",
    resolution.resolved_at !== null,
  );
  TestValidator.equals(
    "resolved_by_id matches admin",
    resolution.resolved_by_id,
    admin.id,
  );
  // Ensure member cannot resolve their own report (access control)
  await TestValidator.error("member cannot resolve report", async () => {
    await api.functional.communityBbs.admin.post_reports.update(
      memberConnection,
      {
        reportId: report.id,
        body: {
          resolution_notes: "Attempt to resolve as member",
          status: "resolved",
        } satisfies ICommunityBbsPostReport.IUpdate,
      },
    );
  });
  // Verify report resolution is persisted
  const readResolution =
    await api.functional.communityBbs.admin.post_reports.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          resolution_notes: "Resolution notes modified",
          status: "resolved",
        } satisfies ICommunityBbsPostReport.IUpdate,
      },
    );
  typia.assert(readResolution);
  // Verify that resolved_at and resolved_by_id were properly set during initial resolution and preserved
  TestValidator.equals(
    "resolved_at preserved",
    readResolution.resolved_at,
    resolution.resolved_at,
  );
  TestValidator.equals(
    "resolved_by_id preserved",
    readResolution.resolved_by_id,
    admin.id,
  );
}