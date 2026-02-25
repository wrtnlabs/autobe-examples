import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_moderator_reports_decisions_create_report_decision";
import { prepare_random_community_platform_reports_decision } from "../../../prepare/prepare_random_community_platform_reports_decision";

export async function test_api_reports_decisions_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a report decision record by a moderator
  // This test ensures a moderator can join, create a report decision, then retrieve it successfully.
  // Setup moderator connection and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // Use authorization token from join result
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Create a report decision record using utility function
  const createdDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      { body: undefined },
    );
  typia.assert(createdDecision);
  // Retrieve the created report decision by ID
  const retrievedDecision =
    await api.functional.communityPlatform.moderator.reports_decisions.at(
      moderatorConnection,
      {
        id: createdDecision.id,
      },
    );
  typia.assert(retrievedDecision);
  // Validate the retrieved data matches the created one
  TestValidator.equals(
    "retrieved report decision equals created",
    retrievedDecision,
    createdDecision,
  );
  // Validate required fields and enum values
  TestValidator.predicate(
    "decision is approved or dismissed",
    retrievedDecision.decision === "approved" ||
      retrievedDecision.decision === "dismissed",
  );
  TestValidator.predicate(
    "id string non-empty",
    typeof retrievedDecision.id === "string" && retrievedDecision.id.length > 0,
  );
  TestValidator.predicate(
    "report_id string non-empty",
    typeof retrievedDecision.report_id === "string" &&
      retrievedDecision.report_id.length > 0,
  );
  TestValidator.predicate(
    "moderator_id string non-empty",
    typeof retrievedDecision.moderator_id === "string" &&
      retrievedDecision.moderator_id.length > 0,
  );
  // Check nested objects presence
  TestValidator.predicate(
    "report summary present",
    retrievedDecision.report !== null &&
      typeof retrievedDecision.report === "object",
  );
  TestValidator.predicate(
    "moderator summary present",
    retrievedDecision.moderator !== null &&
      typeof retrievedDecision.moderator === "object",
  );
  // Check timestamps are strings for created_at, updated_at; deleted_at nullable string or null
  TestValidator.predicate(
    "created_at is string",
    typeof retrievedDecision.created_at === "string" &&
      retrievedDecision.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof retrievedDecision.updated_at === "string" &&
      retrievedDecision.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is string or null",
    retrievedDecision.deleted_at === null ||
      (typeof retrievedDecision.deleted_at === "string" &&
        retrievedDecision.deleted_at.length > 0),
  );
  // Optional comments field can be null or string
  TestValidator.predicate(
    "comments is string or null",
    retrievedDecision.comments === null ||
      typeof retrievedDecision.comments === "string",
  );
}
