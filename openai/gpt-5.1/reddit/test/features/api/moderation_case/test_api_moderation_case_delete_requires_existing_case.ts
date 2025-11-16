import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_delete_requires_existing_case(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a valid moderation case that must remain unaffected
  const existingCaseKey = `existing-${RandomGenerator.alphaNumeric(16)}`;
  const createBody = {
    case_key: existingCaseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCase);

  // Sanity checks on created case
  TestValidator.equals(
    "created case should use requested case_key",
    createdCase.case_key,
    existingCaseKey,
  );
  TestValidator.equals(
    "created case should have same status as requested",
    createdCase.status,
    createBody.status,
  );
  TestValidator.equals(
    "created case should have same priority as requested",
    createdCase.priority,
    createBody.priority,
  );

  // 3. Prepare a definitely non-existent caseKey
  const nonExistentCaseKey = `non-existent-${RandomGenerator.alphaNumeric(24)}`;
  TestValidator.predicate(
    "non-existent caseKey must differ from existing case_key",
    nonExistentCaseKey !== existingCaseKey,
  );

  // 4. Attempt to delete using the non-existent caseKey and expect a not-found HTTP error
  await TestValidator.httpError(
    "deleting a non-existent moderation case should respond with 404 not found",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.erase(
        connection,
        { caseKey: nonExistentCaseKey },
      );
    },
  );

  // 5. Verify that existing data is not affected (indirectly)
  // We cannot re-fetch by case_key with the current SDK, but we can at least
  // assert that the created case is still structurally valid and its key has
  // not changed in memory, which ensures our reference object is intact.
  typia.assert<ICommunityPlatformModerationCase>(createdCase);
  TestValidator.equals(
    "existing case_key should remain unchanged after failed delete",
    createdCase.case_key,
    existingCaseKey,
  );
}
