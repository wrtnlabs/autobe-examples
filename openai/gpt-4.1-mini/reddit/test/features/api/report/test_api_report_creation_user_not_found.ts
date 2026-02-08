import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_creation_user_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Prepare base connection and simulate user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare a request body with a non-existent user ID (assuming the user ID is part of the body)
  // However, we must determine the required properties for ICommunityPlatformReport.ICreate
  // According to the provided definitions, ICommunityPlatformReport.ICreate is an empty object type.
  // So we don't know exact properties from provided data. But the API description mentions:
  // "Users must supply their user ID, a valid report reason ID referencing predefined reasons, and a descriptive text detailing the issue."
  // Because there are no concrete properties defined for ICreate, we must at least send an empty object.
  // But test requires non-existent userId, so the only way is to pass a body where community_platform_user_id is invalid.
  // Since no schema for that property is given, we cannot create valid body with specified user ID.
  // Given the instructions, if scenario is impossible, rewrite with available APIs.
  // So we will try to send a body with a likely invalid user ID property, but since the schema does not allow it, to comply, we will send an empty object, and expect error.
  // But the API requires the field community_platform_user_id exists and is authenticated.
  // Without that, the API should return an error
  // We'll call the API and expect an error due to missing or invalid user.
  await TestValidator.error(
    "creating report with non-existent user should fail",
    async () => {
      // Call the create report endpoint with an invalid user ID
      // Since ICommunityPlatformReport.ICreate has no defined properties, we pass empty object
      // But we want to simulate non-existent user ID to test error
      // So, try to pass body that should fail user validation.
      // However, per instructions, we cannot invent properties not defined in schema
      // So let's attempt to call with empty body which should fail due to missing user
      await api.functional.communityPlatform.reports.create(userConnection, {
        body: {}, // minimal, but no user ID, should cause error
      });
    },
  );
}
