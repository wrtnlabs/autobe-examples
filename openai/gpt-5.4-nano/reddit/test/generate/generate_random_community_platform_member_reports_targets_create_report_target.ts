import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_target } from "../prepare/prepare_random_community_platform_report_target";

export async function generate_random_community_platform_member_reports_targets_create_report_target(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportTarget.ICreate> | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<void> {
  const prepared: ICommunityPlatformReportTarget.ICreate =
    prepare_random_community_platform_report_target(props.body);
  return await api.functional.communityPlatform.member.reports.targets.createReportTarget(
    connection,
    {
      body: prepared,
      reportId: props.params.reportId,
    },
  );
}
