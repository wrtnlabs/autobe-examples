import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_reason } from "../prepare/prepare_random_community_platform_report_reason";

export async function generate_random_community_platform_report_reasons_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportReason.ICreate>;
  },
): Promise<ICommunityPlatformReportReason> {
  const prepared: ICommunityPlatformReportReason.ICreate =
    prepare_random_community_platform_report_reason(props.body);
  const result: ICommunityPlatformReportReason =
    await api.functional.communityPlatform.reportReasons.create(connection, {
      body: prepared,
    });
  return result;
}
