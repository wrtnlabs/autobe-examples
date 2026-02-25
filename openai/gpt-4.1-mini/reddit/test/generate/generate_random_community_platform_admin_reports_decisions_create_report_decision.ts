import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_reports_decision } from "../prepare/prepare_random_community_platform_reports_decision";

export async function generate_random_community_platform_admin_reports_decisions_create_report_decision(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportsDecision.ICreate> | undefined;
  },
): Promise<ICommunityPlatformReportsDecision> {
  const prepared: ICommunityPlatformReportsDecision.ICreate =
    prepare_random_community_platform_reports_decision(props.body);
  const result: ICommunityPlatformReportsDecision =
    await api.functional.communityPlatform.admin.reports_decisions.createReportDecision(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
