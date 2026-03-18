import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_resolution_retrieval_admin_dismiss_updates_state(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member identity (actor for creating report + dismissing)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(member);
  // 2-4) Create a report via generator (ensures valid target context)
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {},
  );
  typia.assert(report);
  // 5) Dismiss the report decision for that reportId
  const reportId: string & tags.Format<"uuid"> = report.id;
  await api.functional.communityPlatform.member.reports.decisions.dismiss.dismissReportDecision(
    memberConnection,
    {
      reportId,
    },
  );
  // 6) Admin identity
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: `https://example.com/${RandomGenerator.alphaNumeric(10)}` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://example.com/${RandomGenerator.alphaNumeric(10)}` satisfies string &
          tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 7) Fetch resolution (1st)
  const resolved1 =
    await api.functional.communityPlatform.admin.reports.resolution.atReportResolution(
      adminConnection,
      { reportId },
    );
  typia.assert(resolved1);
  const expectedDecision = "dismissed";
  TestValidator.equals(
    "resolutionDecision indicates dismissal",
    resolved1.resolutionDecision,
    expectedDecision,
  );
  TestValidator.equals(
    "moderatedByUserId matches dismissing member",
    resolved1.moderatedByUserId,
    member.id,
  );
  TestValidator.equals(
    "moderationNote is empty for dismiss without note",
    resolved1.moderationNote,
    "",
  );
  TestValidator.predicate("resolvedAt exists", resolved1.resolvedAt.length > 0);
  // 9) Fetch resolution (2nd) to confirm stability
  const resolved2 =
    await api.functional.communityPlatform.admin.reports.resolution.atReportResolution(
      adminConnection,
      { reportId },
    );
  typia.assert(resolved2);
  TestValidator.equals(
    "resolution record stable (id)",
    resolved2.id,
    resolved1.id,
  );
  TestValidator.equals(
    "resolutionDecision stable",
    resolved2.resolutionDecision,
    resolved1.resolutionDecision,
  );
  TestValidator.equals(
    "moderatedByUserId stable",
    resolved2.moderatedByUserId,
    resolved1.moderatedByUserId,
  );
  TestValidator.equals(
    "moderationNote stable",
    resolved2.moderationNote,
    resolved1.moderationNote,
  );
  TestValidator.equals(
    "resolvedAt stable",
    resolved2.resolvedAt,
    resolved1.resolvedAt,
  );
}
