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

export async function test_api_report_terminal_state_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A creates account and community (becoming owner/moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member B creates account and post in the community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // Step 3: Member A creates a report on the post
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
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // Step 4: Member A resolves the report with action='approve' (first resolution)
  const firstResolution =
    await api.functional.communityPlatform.member.communities.reports.update(
      memberAConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: { action: "approve" } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(firstResolution);
  TestValidator.equals(
    "first resolution status is approved",
    firstResolution.status,
    "approved",
  );
  TestValidator.notEquals(
    "resolved_by is set",
    firstResolution.resolvedBy,
    null,
  );
  TestValidator.notEquals(
    "resolved_at is set",
    firstResolution.resolvedAt,
    null,
  );
  // Store original resolution details for comparison
  const originalResolvedBy = firstResolution.resolvedBy;
  const originalResolvedAt = firstResolution.resolvedAt;
  // Step 5: Member A attempts to resolve the same report again with action='dismiss'
  await TestValidator.httpError(
    "second resolution attempt rejected with 409 Conflict",
    409,
    async () =>
      await api.functional.communityPlatform.member.communities.reports.update(
        memberAConnection,
        {
          communityId: community.id,
          reportId: report.id,
          body: {
            action: "dismiss",
          } satisfies ICommunityPlatformReport.IUpdate,
        },
      ),
  );
  // Verify report status remains unchanged
  // Note: We cannot fetch the report directly, but the httpError validation above
  // confirms the second resolution was rejected. The API specification states
  // that 409 is returned when the report is already resolved (approved/dismissed).
  // This validates that the terminal state business rule is enforced.
}
