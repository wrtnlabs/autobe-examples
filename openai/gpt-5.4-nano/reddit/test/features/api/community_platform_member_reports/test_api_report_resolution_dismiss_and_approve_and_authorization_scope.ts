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
import { generate_random_community_platform_member_reports_resolve_report } from "../../../generate/generate_random_community_platform_member_reports_resolve_report";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_resolution } from "../../../prepare/prepare_random_community_platform_report_resolution";

export async function test_api_report_resolution_dismiss_and_approve_and_authorization_scope(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: dismiss
  const dismissModeratorConnection: api.IConnection = { host: connection.host };
  const dismissModerator = await authorize_member_join(
    dismissModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  const dismissCommunity = await generate_random_community_platform_communities_create(
    dismissModeratorConnection,
    {
      body: {} satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
    },
  );
  await generate_random_community_platform_community_moderators_create(
    dismissModeratorConnection,
    {
      body: {
        communityId: dismissCommunity.id,
        moderatorUserId: dismissModerator.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const dismissReporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(dismissReporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const dismissReport = await generate_random_community_platform_member_reports_create(
    dismissReporterConnection,
    {
      body: {
        communityId: dismissCommunity.id,
      } satisfies DeepPartial<ICommunityPlatformReport.ICreate>,
    },
  );
  typia.assert(dismissReport);
  const dismissResolution = await generate_random_community_platform_member_reports_resolve_report(
    dismissModeratorConnection,
    {
      params: { reportId: dismissReport.id },
      body: {
        resolution_decision: "dismissed",
        moderation_note: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformReportResolution.ICreate,
    },
  );
  typia.assert(dismissResolution);
  TestValidator.equals(
    "dismiss resolutionDecision",
    dismissResolution.resolutionDecision,
    "dismissed",
  );
  TestValidator.equals(
    "dismiss moderatedByUserId",
    dismissResolution.moderatedByUserId,
    dismissModerator.id,
  );
  // Scenario 2: approve
  const approveModeratorConnection: api.IConnection = { host: connection.host };
  const approveModerator = await authorize_member_join(
    approveModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  const approveCommunity = await generate_random_community_platform_communities_create(
    approveModeratorConnection,
    {
      body: {} satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
    },
  );
  await generate_random_community_platform_community_moderators_create(
    approveModeratorConnection,
    {
      body: {
        communityId: approveCommunity.id,
        moderatorUserId: approveModerator.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const approveReporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(approveReporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const approveReport = await generate_random_community_platform_member_reports_create(
    approveReporterConnection,
    {
      body: {
        communityId: approveCommunity.id,
      } satisfies DeepPartial<ICommunityPlatformReport.ICreate>,
    },
  );
  typia.assert(approveReport);
  const approveResolution = await generate_random_community_platform_member_reports_resolve_report(
    approveModeratorConnection,
    {
      params: { reportId: approveReport.id },
      body: {
        resolution_decision: "approved",
        moderation_note: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformReportResolution.ICreate,
    },
  );
  typia.assert(approveResolution);
  TestValidator.equals(
    "approve resolutionDecision",
    approveResolution.resolutionDecision,
    "approved",
  );
  TestValidator.equals(
    "approve moderatedByUserId",
    approveResolution.moderatedByUserId,
    approveModerator.id,
  );
  // Scenario 3: authorization scope
  const scopeCommunityA: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_member_join(scopeCommunityA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const communityA = await generate_random_community_platform_communities_create(
    scopeCommunityA,
    {
      body: {} satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
    },
  );
  await generate_random_community_platform_community_moderators_create(
    scopeCommunityA,
    {
      body: {
        communityId: communityA.id,
        moderatorUserId: moderatorA.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const reporterA: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const reportInA = await generate_random_community_platform_member_reports_create(reporterA, {
    body: {
      communityId: communityA.id,
    } satisfies DeepPartial<ICommunityPlatformReport.ICreate>,
  });
  typia.assert(reportInA);
  const scopeCommunityB: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_member_join(scopeCommunityB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const communityB = await generate_random_community_platform_communities_create(
    scopeCommunityB,
    {
      body: {} satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
    },
  );
  await generate_random_community_platform_community_moderators_create(
    scopeCommunityB,
    {
      body: {
        communityId: communityB.id,
        moderatorUserId: moderatorB.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  await TestValidator.error(
    "non-moderator for report's community cannot resolve",
    async () => {
      await generate_random_community_platform_member_reports_resolve_report(
        scopeCommunityB,
        {
          params: { reportId: reportInA.id },
          body: {
            resolution_decision: "dismissed",
            moderation_note: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformReportResolution.ICreate,
        },
      );
    },
  );
}
