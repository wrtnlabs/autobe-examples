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
import { generate_random_community_platform_admin_reports_snapshots_create_snapshot } from "../../../generate/generate_random_community_platform_admin_reports_snapshots_create_snapshot";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_snapshot } from "../../../prepare/prepare_random_community_platform_report_snapshot";

export async function test_api_report_snapshot_admin_access_denied_wrong_community_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(admin);
  // Create community A owned by admin
  const communityA =
    await generate_random_community_platform_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon-a.png" satisfies string &
            tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 2) Member actor
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
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberLogin);
  // Create community B owned by member
  const communityB =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon-b.png" satisfies string &
            tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // Create post in community B, then create a report targeting that post.
  // Use dedicated generators with preparation to ensure referential integrity.
  const postReport = await (async () => {
    // Generate a post first via generator (void return), then create a report via generator
    // that prepares required target internally.
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: communityB.id,
          post_type: "text",
          title: RandomGenerator.name(3),
          body_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    // Create report; provide communityId and let generator handle target binding.
    // Provide only fields required by DTO.
    return generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          communityId: communityB.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  })();
  const report = await postReport;
  typia.assert(report);
  const initialSnapshotCount = report.snapshots.length;
  const snapshotBody = {
    snapshot_reason: RandomGenerator.paragraph({ sentences: 1 }),
    snapshot_status: "dismissed",
    community_platform_report_resolution_id: null,
    snapshot_decisioned_at: null,
  } satisfies ICommunityPlatformReportSnapshot.ICreate;
  await TestValidator.httpError(
    "admin snapshot creation denied due to wrong community scope",
    [403, 404],
    async () => {
      await generate_random_community_platform_admin_reports_snapshots_create_snapshot(
        adminConnection,
        {
          params: { reportId: report.id },
          body: snapshotBody,
        },
      );
    },
  );
  TestValidator.equals(
    "snapshot timeline unchanged for denied request",
    report.snapshots.length,
    initialSnapshotCount,
  );
}
