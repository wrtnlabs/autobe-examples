import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_report_resolution } from "../prepare/prepare_random_community_report_resolution";

export async function generate_random_community_member_reports_resolution_resolve(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityReportResolution.ICreate>;
    params: {
      reportId: string;
    };
  },
): Promise<ICommunityReportResolution> {
  const prepared: ICommunityReportResolution.ICreate =
    prepare_random_community_report_resolution(props.body);
  const result: ICommunityReportResolution =
    await api.functional.community.member.reports._resolution.resolve(
      connection,
      {
        reportId: props.params.reportId,
        body: prepared,
      },
    );
  return result;
}
