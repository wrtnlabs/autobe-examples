import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_report } from "../prepare/prepare_random_reddit_platform_report";

export async function generate_random_reddit_platform_member_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformReport.ICreate> | undefined;
  },
): Promise<IRedditPlatformReport> {
  const prepared: IRedditPlatformReport.ICreate =
    prepare_random_reddit_platform_report(props.body);
  const result: IRedditPlatformReport =
    await api.functional.redditPlatform.member.reports.create(connection, {
      body: prepared,
    });
  return result;
}
