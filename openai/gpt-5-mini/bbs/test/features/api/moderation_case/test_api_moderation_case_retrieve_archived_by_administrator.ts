import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_moderation_case_retrieve_archived_by_administrator(
  connection: api.IConnection,
) {
  /**
   * Administrator retrieval of an archived/closed moderation case.
   *
   * Steps:
   *
   * 1. Register a new administrator via POST /auth/administrator/join
   * 2. Create a moderation case via POST
   *    /econPoliticalForum/administrator/moderationCases
   * 3. Archive the case by updating it to closed state via PUT (set status and
   *    closed_at)
   * 4. Retrieve the case via GET
   *    /econPoliticalForum/administrator/moderationCases/{caseId}
   * 5. Assert the administrator can retrieve the record and archival metadata is
   *    preserved (if present)
   */

  // 1) Administrator registration
  const adminPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminPayload,
    });
  typia.assert(admin);

  // The SDK sets connection.headers.Authorization automatically on join

  // 2) Create a moderation case
  const caseNumber = `CASE-${RandomGenerator.alphaNumeric(6)}-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`;
  const createBody = {
    case_number: caseNumber,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    status: "open",
    priority: "normal",
    summary: RandomGenerator.paragraph({ sentences: 6 }),
    escalation_reason: null,
    assigned_moderator_id: null,
    owner_admin_id: admin.user?.id ?? null,
    lead_report_id: null,
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCase);

  TestValidator.equals(
    "created case case_number preserved",
    createdCase.case_number,
    caseNumber,
  );

  // 3) Archive the case by setting status to closed and closed_at timestamp.
  // Note: deleted_at is a system-managed soft-delete field and is not part of IUpdate.
  // Use allowed update fields only.
  const closedAt = new Date().toISOString();
  const updateBody = {
    status: "closed",
    closed_at: closedAt,
    // keep other optional fields undefined by omission
  } satisfies IEconPoliticalForumModerationCase.IUpdate;

  const updatedCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.update(
      connection,
      {
        caseId: createdCase.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCase);

  TestValidator.equals(
    "case status updated to closed",
    updatedCase.status,
    "closed",
  );

  // 4) Retrieve the archived/closed case
  const readCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.at(
      connection,
      {
        caseId: createdCase.id,
      },
    );
  typia.assert(readCase);

  // 5) Assertions
  TestValidator.equals(
    "retrieved case id matches created id",
    readCase.id,
    createdCase.id,
  );
  TestValidator.equals(
    "retrieved case_number matches",
    readCase.case_number,
    createdCase.case_number,
  );

  // The response may or may not include deleted_at depending on server semantics.
  // Ensure administrator can retrieve the record and archival metadata is either null or a string datetime.
  TestValidator.predicate(
    "archival metadata is null or ISO string",
    readCase.deleted_at === null || typeof readCase.deleted_at === "string",
  );
}
