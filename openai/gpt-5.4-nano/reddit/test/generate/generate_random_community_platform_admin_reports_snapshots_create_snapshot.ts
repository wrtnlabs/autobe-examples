import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_snapshot } from "../prepare/prepare_random_community_platform_report_snapshot";

export async function generate_random_community_platform_admin_reports_snapshots_create_snapshot(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportSnapshot.ICreate> | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<ICommunityPlatformReportSnapshot> {
  const prepared: ICommunityPlatformReportSnapshot.ICreate =
    prepare_random_community_platform_report_snapshot(props.body);
  return await api.functional.communityPlatform.admin.reports.snapshots.createSnapshot(
    connection,
    {
      body: prepared,
      reportId: props.params.reportId,
    },
  );
}
