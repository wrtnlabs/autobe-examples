import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_dismissal } from "../prepare/prepare_random_community_platform_report_dismissal";

export async function generate_random_community_platform_admin_reports_dismissals_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportDismissal.ICreate> | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<ICommunityPlatformReportDismissal> {
  const prepared: ICommunityPlatformReportDismissal.ICreate =
    prepare_random_community_platform_report_dismissal(props.body);
  return await api.functional.communityPlatform.admin.reports.dismissals.create(
    connection,
    {
      body: prepared,
      reportId: props.params.reportId,
    },
  );
}
