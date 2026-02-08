import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_decision } from "../prepare/prepare_random_community_platform_report_decision";

export async function generate_random_community_platform_moderator_reports_decisions_create_report_decision(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportDecision.ICreate> | undefined;
  },
): Promise<ICommunityPlatformReportDecision> {
  const prepared: ICommunityPlatformReportDecision.ICreate =
    prepare_random_community_platform_report_decision(props.body);
  const result: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reportsDecisions.createReportDecision(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
