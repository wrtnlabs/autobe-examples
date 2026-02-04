import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_status } from "../prepare/prepare_random_community_platform_report_status";

export async function generate_random_community_platform_user_report_statuses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportStatus.ICreate> | undefined;
  },
): Promise<ICommunityPlatformReportStatus> {
  const prepared: ICommunityPlatformReportStatus.ICreate =
    prepare_random_community_platform_report_status(props.body);
  return await api.functional.communityPlatform.user.report_statuses.create(
    connection,
    {
      body: prepared,
    },
  );
}
