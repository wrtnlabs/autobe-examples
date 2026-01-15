import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import { prepare_random_community_platform_report_dispute } from "../prepare/prepare_random_community_platform_report_dispute";
export async function generate_random_community_platform_member_report_disputes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportDispute.ICreate> | undefined;
  },
): Promise<ICommunityPlatformReportDispute> {
  const prepared: ICommunityPlatformReportDispute.ICreate =
    prepare_random_community_platform_report_dispute(props.body);
  return await api.functional.communityPlatform.member.report.disputes.create(
    connection,
    {
      body: prepared,
    },
  );
}
