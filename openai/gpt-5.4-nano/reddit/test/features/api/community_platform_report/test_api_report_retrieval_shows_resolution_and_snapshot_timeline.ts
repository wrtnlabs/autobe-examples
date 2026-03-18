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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_retrieval_shows_resolution_and_snapshot_timeline(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Create community
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png" satisfies
          | string
          | (string & tags.Format<"uri">),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Assign moderator (same member)
  const moderator =
    await generate_random_community_platform_community_moderators_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: memberAuth.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 4) Create a report (helper should prepare a valid target context)
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } as const,
    },
  );
  typia.assert(report);
  // 5) Approve the report as moderator
  const resolution =
    await api.functional.communityPlatform.member.reports.decisions.approve.approveReportDecision(
      memberConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(resolution);
  // 6) Retrieve report detail as moderator
  const retrieved = await api.functional.communityPlatform.member.reports.at(
    memberConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrieved);
  // 7) Validate resolution exists and matches decision
  const { resolution: retrievedResolution, snapshots } = retrieved;
  typia.assert(retrievedResolution);
  TestValidator.equals(
    "resolution decision",
    retrievedResolution!.resolutionDecision,
    resolution.resolutionDecision,
  );
  TestValidator.equals(
    "moderated_by_user_id",
    retrievedResolution!.moderatedByUserId,
    memberAuth.id,
  );
  TestValidator.equals("resolution id", retrievedResolution!.id, resolution.id);
  TestValidator.equals(
    "moderation note",
    retrievedResolution!.moderationNote,
    resolution.moderationNote,
  );
  TestValidator.predicate(
    "resolvedAt present",
    typeof retrievedResolution!.resolvedAt === "string" &&
      retrievedResolution!.resolvedAt.length > 0,
  );
  // 8) Validate snapshots and latest snapshot aligns with resolution
  TestValidator.predicate(
    "snapshots array present",
    Array.isArray(snapshots) && snapshots.length >= 1,
  );
  const latestSnapshot = snapshots
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))[
    snapshots.length - 1
  ];
  typia.assert(latestSnapshot);
  TestValidator.equals(
    "latest snapshot matches report id",
    latestSnapshot.community_platform_report_id,
    retrieved.id,
  );
  // If resolution exists, the latest snapshot should carry a decisioned timestamp.
  TestValidator.predicate(
    "latest snapshot has decisioned timestamp",
    latestSnapshot.snapshot_decisioned_at !== null,
  );
}
