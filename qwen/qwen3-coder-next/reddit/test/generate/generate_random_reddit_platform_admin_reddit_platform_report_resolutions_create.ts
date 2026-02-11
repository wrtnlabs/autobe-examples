import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_report_resolution } from "../prepare/prepare_random_reddit_platform_report_resolution";

export async function generate_random_reddit_platform_admin_reddit_platform_report_resolutions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformReportResolution.ICreate> | undefined;
  },
): Promise<IRedditPlatformReportResolution> {
  const prepared: IRedditPlatformReportResolution.ICreate =
    prepare_random_reddit_platform_report_resolution(props.body);
  return await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.create(
    connection,
    {
      body: prepared,
    },
  );
}
