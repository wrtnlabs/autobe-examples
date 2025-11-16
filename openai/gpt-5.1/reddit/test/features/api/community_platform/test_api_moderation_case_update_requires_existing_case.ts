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
 * Verify that updating a moderation case by caseKey strictly requires an
 * existing case and returns a not-found style error otherwise.
 *
 * Business purpose:
 *
 * - Ensure the admin-only moderation case update endpoint does not behave as an
 *   upsert and correctly signals when the target case does not exist.
 *
 * Flow:
 *
 * 1. Join as an adminUser using /auth/adminUser/join to obtain an authorized admin
 *    context (token is set on the connection by SDK).
 * 2. Generate a clearly non-existent moderation caseKey using high entropy random
 *    data, making collision with any real case practically impossible.
 * 3. Build a valid ICommunityPlatformModerationCase.IUpdate payload that would
 *    succeed if the case existed (e.g., update title, description, status,
 *    priority, and assignment).
 * 4. Call PUT /communityPlatform/adminUser/moderationCases/{caseKey} via
 *    api.functional.communityPlatform.adminUser.moderationCases.update with the
 *    non-existent caseKey and the valid body.
 * 5. Assert using TestValidator.httpError that the operation results in a
 *    404-style not-found HTTP error, confirming that the endpoint does not
 *    implicitly create new cases for unknown keys.
 */
export async function test_api_moderation_case_update_requires_existing_case(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain an authorized context
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

  // 2. Construct a clearly non-existent caseKey
  const nonExistentCaseKey: string = `test-non-existent-case-${RandomGenerator.alphaNumeric(32)}`;

  // 3. Build a valid update payload that would succeed if the case existed
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "resolved",
    priority: "high",
    // Assigning to the same admin that just joined is a realistic scenario
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  // 4 & 5. Attempt to update the non-existent case and assert 404 error
  await TestValidator.httpError(
    "update non-existent moderation case should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.update(
        connection,
        {
          caseKey: nonExistentCaseKey,
          body: updateBody,
        },
      );
    },
  );
}
