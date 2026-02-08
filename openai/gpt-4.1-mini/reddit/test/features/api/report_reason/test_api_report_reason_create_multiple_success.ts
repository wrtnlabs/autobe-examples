import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_report_reasons_create } from "../../../generate/generate_random_community_platform_report_reasons_create";
import { prepare_random_community_platform_report_reason } from "../../../prepare/prepare_random_community_platform_report_reason";

export async function test_api_report_reason_create_multiple_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup user-specific connection (no authorization util provided)
  const userConnection: api.IConnection = { host: connection.host };
  // Create multiple report reasons sequentially with empty body
  const count = 3;
  const createdReasons: ICommunityPlatformReportReason[] = [];
  for (let i = 0; i < count; ++i) {
    const created =
      await generate_random_community_platform_report_reasons_create(
        userConnection,
        {
          body: {},
        },
      );
    typia.assert(created);
    createdReasons.push(created);
  }
  // Validate each reason has a unique id
  for (let i = 0; i < count; ++i) {
    for (let j = 0; j < count; ++j) {
      if (i === j) {
        TestValidator.equals(
          `same id check ${i}`,
          createdReasons[i],
          createdReasons[j],
        );
      } else {
        TestValidator.notEquals(
          `different id check ${i} and ${j}`,
          createdReasons[i],
          createdReasons[j],
        );
      }
    }
  }
}
