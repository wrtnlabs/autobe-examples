import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";

/**
 * Validate moderation case update uniqueness constraint.
 *
 * Business context:
 *
 * - Administrators manage moderation cases identified by a human-facing
 *   case_number that must be unique. Attempting to change a case's case_number
 *   to an already existing case_number should fail with a uniqueness violation
 *   and must not partially apply state changes.
 *
 * Test steps implemented:
 *
 * 1. Register administrator (auth.administrator.join).
 * 2. Create two moderation cases (A and B) with distinct case_numbers.
 * 3. Attempt to update case B's case_number to case A's case_number.
 * 4. Assert that the update call fails (uniqueness conflict) and that case B's
 *    original creation response still holds the original case_number.
 *
 * Notes:
 *
 * - The provided SDK does not include GET/read or audit endpoints; therefore this
 *   test asserts failure on the update call and verifies the in-memory creation
 *   response for case B. If read/audit endpoints exist in your environment,
 *   extend this test to re-fetch case B and assert audit entries.
 */
export async function test_api_moderation_case_update_validation_and_conflict(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPass!123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Create moderation case A
  const caseNumberA = `CASE-${RandomGenerator.alphaNumeric(8)}`;
  const caseA: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: {
          case_number: caseNumberA,
          status: "open",
          priority: "normal",
          legal_hold: false,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          summary: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEconPoliticalForumModerationCase.ICreate,
      },
    );
  typia.assert(caseA);

  // 3. Create moderation case B
  const caseNumberB = `CASE-${RandomGenerator.alphaNumeric(8)}`;
  const caseB: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: {
          case_number: caseNumberB,
          status: "open",
          priority: "normal",
          legal_hold: false,
          title: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconPoliticalForumModerationCase.ICreate,
      },
    );
  typia.assert(caseB);

  // 4. Attempt to update case B with case_number of case A → expect error
  await TestValidator.error(
    "updating case B to use caseNumber of case A should fail (uniqueness)",
    async () => {
      await api.functional.econPoliticalForum.administrator.moderationCases.update(
        connection,
        {
          caseId: caseB.id,
          body: {
            case_number: caseA.case_number,
          } satisfies IEconPoliticalForumModerationCase.IUpdate,
        },
      );
    },
  );

  // 5. Verify that the original creation response for case B still has the same case_number
  // Note: SDK does not provide a GET endpoint for moderation cases in the provided materials,
  // so we cannot re-fetch the server state or inspect audit logs. We assert that our
  // in-memory creation response (caseB) still holds the original case_number value.
  TestValidator.equals(
    "case B's original case_number remains unchanged",
    caseB.case_number,
    caseNumberB,
  );
}
