import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import { prepare_random_community_platform_report_tracking } from "../prepare/prepare_random_community_platform_report_tracking";
export async function generate_random_community_platform_admin_report_tracking_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportTracking.ICreate> | undefined;
  },
): Promise<ICommunityPlatformReportTracking> {
  const prepared: ICommunityPlatformReportTracking.ICreate =
    prepare_random_community_platform_report_tracking(props.body);
  return await api.functional.communityPlatform.admin.report.tracking.create(
    connection,
    {
      body: prepared,
    },
  );
}
