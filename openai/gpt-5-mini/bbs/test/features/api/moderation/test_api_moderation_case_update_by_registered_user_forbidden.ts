import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";

export async function test_api_moderation_case_update_by_registered_user_forbidden(
  connection: api.IConnection,
) {
  // This test validates that a regular registered user cannot update an
  // administrator-scoped moderation case. The test focuses on authorization
  // rejection (403 Forbidden) because the provided SDK does not include a
  // GET endpoint for moderation cases nor audit-log retrieval, so database
  // and audit verification cannot be performed here.

  // 1) Administrator signs up (join) -> obtain admin authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // satisfies MinLength<10>
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a moderation case as admin
  const caseBody = {
    case_number: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    status: "open",
    priority: "normal",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: caseBody,
      },
    );
  typia.assert(createdCase);

  // Capture caseId for update attempts
  const caseId: string = createdCase.id;

  // 3) Registered user signs up (join) -> connection now uses registered user's token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 4) As the regular registered user, attempt to update the admin moderation case
  // Expectation: server responds with 403 Forbidden
  await TestValidator.httpError(
    "registered user cannot update administrator moderation case (should be 403)",
    403,
    async () => {
      await api.functional.econPoliticalForum.administrator.moderationCases.update(
        connection,
        {
          caseId,
          body: {
            title: "Unauthorized modification attempt",
          } satisfies IEconPoliticalForumModerationCase.IUpdate,
        },
      );
    },
  );

  // NOTE: Cannot verify database state or audit logs because SDK lacks GET/audit endpoints.
  // The HTTP 403 is taken as authoritative evidence that access control is enforced.
}
