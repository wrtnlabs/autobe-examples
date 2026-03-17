import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_approve_content_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A (community owner and moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Create Member B (post author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 3: Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 4: Member B creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberBConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // Step 5: Member A creates a report on Member B's post
  const report = await generate_random_community_platform_member_reports_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        target_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  // Verify initial report state
  TestValidator.equals("initial report status", report.status, "pending");
  TestValidator.equals("report has no resolver", report.resolvedBy, null);
  TestValidator.equals("report has no resolved_at", report.resolvedAt, null);
  // Step 6: Member A (as moderator) approves the report
  const updatedReport =
    await api.functional.communityPlatform.member.communities.reports.update(
      memberAConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {
          action: "approve",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Validate report status updated
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolved_by is set",
    updatedReport.resolvedBy !== null,
  );
  TestValidator.predicate(
    "resolved_at is set",
    updatedReport.resolvedAt !== null,
  );
  // Validate resolver is Member A
  if (updatedReport.resolvedBy !== null) {
    TestValidator.equals(
      "resolver is Member A",
      updatedReport.resolvedBy.id,
      memberA.id,
    );
  }
  // Validate the reported post is soft-deleted
  TestValidator.predicate("target post exists", updatedReport.target !== null);
  // Check post deletion status
  const targetPost = updatedReport.target as ICommunityPlatformPost;
  TestValidator.predicate(
    "post deleted_at is set",
    targetPost.deletedAt !== null,
  );
  TestValidator.predicate(
    "deleted_at is valid timestamp",
    targetPost.deletedAt !== null &&
      typeof targetPost.deletedAt === "string" &&
      targetPost.deletedAt.length > 0,
  );
}
