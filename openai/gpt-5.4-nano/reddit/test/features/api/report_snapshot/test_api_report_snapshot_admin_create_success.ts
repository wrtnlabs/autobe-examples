import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_snapshot } from "../../../prepare/prepare_random_community_platform_report_snapshot";

export async function test_api_report_snapshot_admin_create_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCreds });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {},
  );
  typia.assert(report);
  const reportId: string & tags.Format<"uuid"> = report.id;
  const snapshotReason1 = RandomGenerator.paragraph({ sentences: 2 });
  const snapshotStatus1 = typia.random<string>();
  const createdAtBefore = Date.now();
  const snapshot1: ICommunityPlatformReportSnapshot =
    await generate_random_community_platform_admin_reports_snapshots_create_snapshot(
      adminConnection,
      {
        params: { reportId },
        body: {
          snapshot_reason: snapshotReason1,
          snapshot_status: snapshotStatus1,
        } satisfies ICommunityPlatformReportSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  const createdAtAfter = Date.now();
  TestValidator.equals(
    "community_platform_report_id matches reportId",
    snapshot1.community_platform_report_id,
    reportId,
  );
  TestValidator.equals(
    "snapshot_reason matches",
    snapshot1.snapshot_reason,
    snapshotReason1,
  );
  TestValidator.equals(
    "snapshot_status matches",
    snapshot1.snapshot_status,
    snapshotStatus1,
  );
  TestValidator.equals("deleted_at is null", snapshot1.deleted_at, null);
  TestValidator.predicate(
    "captured_at is close to now",
    (() => {
      const capturedMs = Date.parse(snapshot1.captured_at);
      return (
        capturedMs >= createdAtBefore && capturedMs <= createdAtAfter + 5000
      );
    })(),
  );
  TestValidator.predicate(
    "reviewed_by_admin_id is set",
    snapshot1.reviewed_by_admin_id !== null,
  );
  TestValidator.equals(
    "reviewed_by_member_id is null",
    snapshot1.reviewed_by_member_id,
    null,
  );
  const snapshotReason2 = RandomGenerator.paragraph({ sentences: 2 });
  const snapshotStatus2 = typia.random<string>();
  const snapshot2: ICommunityPlatformReportSnapshot =
    await generate_random_community_platform_admin_reports_snapshots_create_snapshot(
      adminConnection,
      {
        params: { reportId },
        body: {
          snapshot_reason: snapshotReason2,
          snapshot_status: snapshotStatus2,
        } satisfies ICommunityPlatformReportSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  TestValidator.notEquals(
    "snapshot records are distinct",
    snapshot1.id,
    snapshot2.id,
  );
  TestValidator.equals(
    "snapshot2 ties to reportId",
    snapshot2.community_platform_report_id,
    reportId,
  );
  TestValidator.equals(
    "snapshot2 snapshot_reason matches",
    snapshot2.snapshot_reason,
    snapshotReason2,
  );
  TestValidator.equals(
    "snapshot2 snapshot_status matches",
    snapshot2.snapshot_status,
    snapshotStatus2,
  );
}
