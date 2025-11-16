import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Ensure deleted moderation cases are not retrievable by case_key.
 *
 * Business goal: When an adminUser deletes a moderation case, that case must no
 * longer be accessible through the normal retrieval endpoint that looks up
 * cases by their business-level case_key. The documentation for the retrieval
 * endpoint explicitly states that only cases where `deleted_at` is null should
 * be returned in normal flows, and that archived/deleted cases must surface as
 * a standard not-found style result instead of leaking details.
 *
 * This test covers the happy-path creation flow followed by deletion and a
 * retrieval attempt, ensuring that the read API behaves as if the case no
 * longer exists after deletion.
 *
 * Scenario steps
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join to obtain an
 *    authorized admin context (SDK automatically wires Authorization header
 *    from the returned token).
 * 2. Using the authenticated admin context, create a new moderation case via POST
 *    /communityPlatform/adminUser/moderationCases providing a unique case_key,
 *    title, optional description, status, priority, and leaving
 *    assigned_adminuser_id undefined.
 * 3. Verify that the case is created successfully and that core fields such as
 *    case_key, status, priority, creator_adminuser_id, created_at, and
 *    deleted_at (null/undefined) conform to the
 *    ICommunityPlatformModerationCase contract using typia.assert.
 * 4. Delete the moderation case via DELETE
 *    /communityPlatform/adminUser/moderationCases/{caseKey} using the same
 *    case_key that was used during creation.
 * 5. Attempt to retrieve the moderation case again via GET
 *    /communityPlatform/adminUser/moderationCases/{caseKey} and assert that the
 *    call fails, using TestValidator.error to guarantee an error is raised when
 *    accessing a deleted case. The test must not assert specific HTTP status
 *    codes, only that the call does not succeed.
 *
 * Technical constraints
 *
 * - Use only the imported API functions and DTOs from the template.
 * - Do not import or reference any additional modules.
 * - Do not access or modify connection.headers directly; authentication is
 *   handled automatically by the join endpoint.
 * - Use typia.random and RandomGenerator utilities to generate realistic test
 *   data (email, case_key, title, etc.) while satisfying DTO constraints.
 * - Use TestValidator.error with a descriptive title and an async callback to
 *   validate the failing retrieval step after deletion.
 */
export async function test_api_moderation_case_retrieval_excludes_soft_deleted_cases(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a new moderation case with a unique case_key
  const caseKey: string = RandomGenerator.alphaNumeric(16);

  const createBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: undefined,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  // Sanity checks on the created case
  TestValidator.equals(
    "created case_key matches input",
    createdCase.case_key,
    caseKey,
  );
  TestValidator.equals(
    "created status matches input",
    createdCase.status,
    createBody.status,
  );
  TestValidator.equals(
    "created priority matches input",
    createdCase.priority,
    createBody.priority,
  );

  // 3. Delete the moderation case by caseKey
  await api.functional.communityPlatform.adminUser.moderationCases.erase(
    connection,
    {
      caseKey,
    },
  );

  // 4. Attempt to retrieve the deleted case and expect an error
  await TestValidator.error(
    "retrieving a deleted moderation case by case_key must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.at(
        connection,
        {
          caseKey,
        },
      );
    },
  );
}
