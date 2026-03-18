import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_resolution } from "../prepare/prepare_random_community_platform_report_resolution";

export async function generate_random_community_platform_member_reports_resolve_report(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportResolution.ICreate> | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<ICommunityPlatformReportResolution> {
  const prepared: ICommunityPlatformReportResolution.ICreate =
    prepare_random_community_platform_report_resolution(props.body);
  return await api.functional.communityPlatform.member.reports.resolveReport(
    connection,
    {
      body: prepared,
      reportId: props.params.reportId,
    },
  );
}
