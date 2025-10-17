import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_moderation_case_retrieve_forbidden_for_regular_user(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate that an ordinary registered user cannot retrieve
   * moderator-scoped moderation case details. Flow:
   *
   * 1. Create moderator (auth.moderator.join) -> connection becomes moderator
   * 2. Create moderation case as moderator
   * 3. Create separate registered user (auth.registeredUser.join) -> connection
   *    becomes regular user
   * 4. Attempt to GET moderation case as regular user -> must throw (forbidden or
   *    not-found)
   * 5. Confirm created case still exists (using the captured createdCase snapshot)
   *
   * Limitations/Notes:
   *
   * - No login endpoint or delete endpoints are provided in the available SDK;
   *   the test does not attempt cleanup. Test environment must reset DB or
   *   provide teardown hooks.
   * - Audit log verification (econ_political_forum_audit_logs) cannot be
   *   performed because no audit-log API was provided. Such verification should
   *   be done outside this E2E test (DB query or dedicated admin API).
   */

  // 1. Moderator signs up
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2. Moderator creates a moderation case
  const caseBody = {
    case_number: `CASE-${Date.now()}`,
    title: "E2E: access-control test case",
    status: "open",
    priority: "normal",
    summary: "Testing that regular users cannot retrieve moderator cases",
    escalation_reason: null,
    assigned_moderator_id: null,
    owner_admin_id: null,
    lead_report_id: null,
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: caseBody,
      },
    );
  typia.assert(createdCase);

  // Validate created case fields match expectations
  TestValidator.equals(
    "created case number matches request",
    createdCase.case_number,
    caseBody.case_number,
  );
  TestValidator.equals(
    "created case status matches request",
    createdCase.status,
    caseBody.status,
  );
  TestValidator.equals(
    "created case priority matches request",
    createdCase.priority,
    caseBody.priority,
  );

  // 3. Register a separate regular user (switches connection to the regular user automatically)
  const userBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserP@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userBody,
    });
  typia.assert(registered);

  // 4. Attempt to retrieve the moderation case as the regular user: expect the call to fail (forbidden or not-found)
  await TestValidator.error(
    "regular user cannot access moderator-scoped moderation case",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationCases.at(
        connection,
        {
          caseId: createdCase.id,
        },
      );
    },
  );

  // 5. Verify createdCase snapshot remains valid and key fields exist
  typia.assert(createdCase);
  TestValidator.predicate(
    "moderation case still has legal_hold boolean",
    typeof createdCase.legal_hold === "boolean",
  );

  // Note: Cleanup (deleting or archiving created resources) is not performed here because
  // the provided SDK does not include delete/archive APIs. Ensure test DB reset between runs.
}
