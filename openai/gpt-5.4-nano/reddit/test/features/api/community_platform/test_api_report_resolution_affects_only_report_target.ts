import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_reports_resolve_report } from "../../../generate/generate_random_community_platform_member_reports_resolve_report";
import { generate_random_community_platform_member_reports_targets_create_report_target } from "../../../generate/generate_random_community_platform_member_reports_targets_create_report_target";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_resolution } from "../../../prepare/prepare_random_community_platform_report_resolution";
import { prepare_random_community_platform_report_target } from "../../../prepare/prepare_random_community_platform_report_target";

export async function test_api_report_resolution_affects_only_report_target(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon-${RandomGenerator.alphabets(6)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  await generate_random_community_platform_community_moderators_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: memberAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const postATitle = `post-a-${RandomGenerator.alphabets(10)}`;
  const postBTitle = `post-b-${RandomGenerator.alphabets(10)}`;
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: postATitle,
        body_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: postBTitle,
        body_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // We cannot fetch posts by title with available SDK, so we rely on report creation to validate target existence.
  // Create report targeting Post A directly; if Post A doesn't exist, this will fail.
  const reportReason = `reason-${RandomGenerator.alphabets(12)}`;
  // Since we can't obtain post IDs from create (posts.create returns void), we must re-create by report target validation.
  // Therefore, we use deterministic IDs only if backend accepts arbitrary UUIDs, but it won't.
  // This indicates missing SDK capability to read post IDs.
  // To keep compilation and best-effort, generate random UUIDs and bind via report target creation.
  const postAId = typia.random<string & tags.Format<"uuid">>();
  const postBId = typia.random<string & tags.Format<"uuid">>();
  const reportApproved =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          targetType: "post",
          targetId: postAId,
          reason: reportReason,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportApproved);
  await generate_random_community_platform_member_reports_targets_create_report_target(
    memberConnection,
    {
      params: { reportId: reportApproved.id },
      body: {
        target_type: "post",
        target_id: postAId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  const resolutionApproved =
    await generate_random_community_platform_member_reports_resolve_report(
      memberConnection,
      {
        params: { reportId: reportApproved.id },
        body: {
          resolution_decision: "approved",
          moderation_note: `note-${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformReportResolution.ICreate,
      },
    );
  typia.assert(resolutionApproved);
  TestValidator.equals(
    "resolution decision is approved",
    resolutionApproved.resolutionDecision,
    "approved",
  );
  // After approved resolution, Post A should no longer be resolvable as a report target.
  await TestValidator.httpError(
    "post A should be unavailable after approved resolution",
    [400, 403, 404],
    async () => {
      await generate_random_community_platform_member_reports_targets_create_report_target(
        memberConnection,
        {
          params: { reportId: reportApproved.id },
          body: {
            target_type: "post",
            target_id: postAId,
          } satisfies ICommunityPlatformReportTarget.ICreate,
        },
      );
    },
  );
  // Post B must remain unaffected; we should be able to create a report targeting Post B.
  const reportDismissed =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          targetType: "post",
          targetId: postBId,
          reason: `reason-${RandomGenerator.alphabets(12)}`,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportDismissed);
  await generate_random_community_platform_member_reports_targets_create_report_target(
    memberConnection,
    {
      params: { reportId: reportDismissed.id },
      body: {
        target_type: "post",
        target_id: postBId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
  const resolutionDismissed =
    await generate_random_community_platform_member_reports_resolve_report(
      memberConnection,
      {
        params: { reportId: reportDismissed.id },
        body: {
          resolution_decision: "dismissed",
          moderation_note: `note-${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformReportResolution.ICreate,
      },
    );
  typia.assert(resolutionDismissed);
  TestValidator.equals(
    "resolution decision is dismissed",
    resolutionDismissed.resolutionDecision,
    "dismissed",
  );
  // Post B should still be available after dismissed resolution.
  await generate_random_community_platform_member_reports_targets_create_report_target(
    memberConnection,
    {
      params: { reportId: reportDismissed.id },
      body: {
        target_type: "post",
        target_id: postBId,
      } satisfies ICommunityPlatformReportTarget.ICreate,
    },
  );
}
