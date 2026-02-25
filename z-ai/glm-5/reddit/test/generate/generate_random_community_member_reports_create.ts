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

import { prepare_random_community_report } from "../prepare/prepare_random_community_report";

export async function generate_random_community_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityReport.ICreate>;
  },
): Promise<ICommunityReport> {
  const prepared: ICommunityReport.ICreate = prepare_random_community_report(
    props.body,
  );
  const result: ICommunityReport =
    await api.functional.community.member.reports.create(connection, {
      body: prepared,
    });
  return result;
}
