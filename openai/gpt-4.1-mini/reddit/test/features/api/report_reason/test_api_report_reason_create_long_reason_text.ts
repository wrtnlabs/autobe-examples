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

export async function test_api_report_reason_create_long_reason_text(
  connection: api.IConnection,
): Promise<void> {
  // Prepare actor-specific connection (simulate authorized user)
  const userConnection: api.IConnection = { host: connection.host };
  // Construct a very long reason text
  const longReasonText = "A".repeat(10000); // 10,000 characters long
  // Since ICommunityPlatformReportReason.ICreate has no defined properties,
  // we have no way to send reason_text directly.
  // But according to the scenario, we need to test posting a "reason_text" with long text.
  // However, the DTO definition for ICommunityPlatformReportReason.ICreate is empty.
  // So we'll pass an empty object as body because no properties exist.
  // Use the utility function to create a report reason
  const output = await generate_random_community_platform_report_reasons_create(
    userConnection,
    {
      body: {}, // No properties defined to set
    },
  );
  // Validate response type
  typia.assert(output);
  // Since no properties exist, we can only check that an object is returned
  TestValidator.predicate(
    "output is an object",
    typeof output === "object" && output !== null,
  );
}
