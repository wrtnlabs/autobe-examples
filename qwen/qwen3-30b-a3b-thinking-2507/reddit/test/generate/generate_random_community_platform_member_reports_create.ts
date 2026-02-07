import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report } from "../prepare/prepare_random_community_platform_report";

export async function generate_random_community_platform_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReport.ICreate>;
  },
): Promise<ICommunityPlatformReport> {
  const prepared: ICommunityPlatformReport.ICreate =
    prepare_random_community_platform_report(props.body);
  const result: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: prepared,
    });
  return result;
}
