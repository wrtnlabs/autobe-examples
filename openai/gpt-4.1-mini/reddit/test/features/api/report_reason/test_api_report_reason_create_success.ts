import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia from "typia";

import { generate_random_community_platform_report_reasons_create } from "../../../generate/generate_random_community_platform_report_reasons_create";
import { prepare_random_community_platform_report_reason } from "../../../prepare/prepare_random_community_platform_report_reason";

export async function test_api_report_reason_create_success(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const reasonText = (
    "Report reason - " +
    RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }).slice(0, 50)
  ).trim();
  const created = await generate_random_community_platform_report_reasons_create(
    userConnection,
    {
      body: { reason_text: reasonText },
    },
  );
  typia.assert(created);
  // No property-based tests to avoid accessing non-existent properties
}