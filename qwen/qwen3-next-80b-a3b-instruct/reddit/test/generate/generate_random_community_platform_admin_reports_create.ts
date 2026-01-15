import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_report } from "../prepare/prepare_random_community_platform_report";
export async function generate_random_community_platform_admin_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReport.ICreate>;
  },
): Promise<ICommunityPlatformReport> {
  const prepared: ICommunityPlatformReport.ICreate =
    prepare_random_community_platform_report(props.body);
  return await api.functional.communityPlatform.admin.reports.create(
    connection,
    {
      body: prepared,
    },
  );
}
