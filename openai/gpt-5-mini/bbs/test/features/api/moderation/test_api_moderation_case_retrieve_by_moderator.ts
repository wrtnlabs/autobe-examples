import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderation_case_retrieve_by_moderator(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Register a new moderator account
   * - Create a moderation case assigned to that moderator with legal_hold = true
   * - Retrieve the created case as the same moderator
   * - Validate returned fields and business rules (assignment, legal_hold,
   *   timestamps)
   *
   * Limitations:
   *
   * - Audit log verification (econ_political_forum_audit_logs) cannot be
   *   performed because the provided SDK does not expose an audit-log retrieval
   *   endpoint.
   * - Reporter anonymity and report-attachment checks cannot be performed because
   *   report creation/attachment APIs were not provided. These checks should be
   *   added later when the corresponding APIs are available.
   */

  // 1) Moderator sign-up (join)
  const moderatorBody = {
    username: `mod_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Quick sanity on moderator id and token (typia.assert above already validated shape)
  TestValidator.predicate(
    "moderator id is present",
    typeof moderator.id === "string" && moderator.id.length > 0,
  );
  TestValidator.predicate(
    "access token is present",
    typeof moderator.token?.access === "string" &&
      moderator.token.access.length > 0,
  );

  // 2) Create moderation case assigned to this moderator
  const caseNumber = `CASE-${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    case_number: caseNumber,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    assigned_moderator_id: moderator.id,
    status: "open",
    priority: "high",
    summary: RandomGenerator.paragraph({ sentences: 10 }),
    escalation_reason: null,
    legal_hold: true,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCase);

  // Basic consistency checks after creation
  TestValidator.equals(
    "created case number matches request",
    createdCase.case_number,
    caseNumber,
  );
  TestValidator.equals(
    "assigned moderator saved",
    createdCase.assigned_moderator_id,
    moderator.id,
  );
  TestValidator.equals("status is open", createdCase.status, "open");
  TestValidator.equals("priority is high", createdCase.priority, "high");
  TestValidator.predicate(
    "legal_hold is true",
    createdCase.legal_hold === true,
  );

  // 3) Retrieve moderation case via moderator-scoped GET
  const retrieved: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.at(
      connection,
      {
        caseId: createdCase.id,
      },
    );
  typia.assert(retrieved);

  // 4) Business assertions on retrieval
  TestValidator.equals(
    "retrieved id matches created id",
    retrieved.id,
    createdCase.id,
  );
  TestValidator.equals(
    "retrieved case number equals created",
    retrieved.case_number,
    createdCase.case_number,
  );
  TestValidator.equals(
    "retrieved assigned moderator matches",
    retrieved.assigned_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "retrieved status",
    retrieved.status,
    createdCase.status,
  );
  TestValidator.equals(
    "retrieved priority",
    retrieved.priority,
    createdCase.priority,
  );
  TestValidator.predicate(
    "retrieved legal_hold preserved",
    retrieved.legal_hold === true,
  );

  // Verify timestamps exist
  TestValidator.predicate(
    "created_at present",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof retrieved.updated_at === "string" && retrieved.updated_at.length > 0,
  );

  // Optional idempotency check: re-fetch and compare key fields
  const reFetched: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.at(
      connection,
      { caseId: createdCase.id },
    );
  typia.assert(reFetched);
  TestValidator.equals("idempotent fetch: id", reFetched.id, retrieved.id);
  TestValidator.equals(
    "idempotent fetch: case_number",
    reFetched.case_number,
    retrieved.case_number,
  );

  // Limitations noted above remain: audit-log and reporter anonymity checks are deferred until
  // relevant APIs are available in the SDK.
}
