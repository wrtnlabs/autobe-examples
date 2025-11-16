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
 * Validate that an authenticated adminUser can delete a moderation case by its
 * business case key, and that unauthenticated deletion is rejected.
 *
 * Business flow covered:
 *
 * 1. Register (join) as a new adminUser and obtain an authorized context with JWT
 *    token automatically wired into the connection.
 * 2. Using this authenticated context, create a new moderation case with a unique
 *    `case_key`, human-readable title, optional description, and non-terminal
 *    initial status/priority.
 * 3. From a fresh unauthenticated connection, attempt to delete the case by
 *    `case_key` and assert that the call fails (proving auth is required).
 * 4. From the original authenticated admin connection, perform the actual deletion
 *    and assert that the operation completes successfully without throwing an
 *    error.
 *
 * Due to the limited SDK surface (no GET-by-caseKey or listing endpoint
 * provided), post-deletion verification is limited to the absence/presence of
 * errors on erase calls rather than re-fetching the case.
 */
export async function test_api_moderation_case_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);

  TestValidator.equals(
    "joined admin username should echo request username",
    authorized.username,
    adminJoinBody.username,
  );
  TestValidator.equals(
    "joined admin email should echo request email",
    authorized.email,
    adminJoinBody.email,
  );

  // 2. Create moderation case under authenticated admin
  const caseKey: string = RandomGenerator.alphaNumeric(12);
  const createBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "medium",
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  TestValidator.predicate(
    "generated case_key should be non-empty",
    () => caseKey.length > 0,
  );
  TestValidator.predicate(
    "generated title should be non-empty",
    () => createBody.title.length > 0,
  );
  TestValidator.equals(
    "created case must echo input case_key",
    createdCase.case_key,
    createBody.case_key,
  );
  TestValidator.equals(
    "created case must echo input status",
    createdCase.status,
    createBody.status,
  );
  TestValidator.equals(
    "created case must echo input priority",
    createdCase.priority,
    createBody.priority,
  );

  // 3. Unauthorized deletion attempt from a fresh unauthenticated connection
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated adminUser must not be able to delete moderation case",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.erase(
        unauthConnection,
        { caseKey: createdCase.case_key },
      );
    },
  );

  // 4. Authorized deletion using the authenticated admin context
  await api.functional.communityPlatform.adminUser.moderationCases.erase(
    connection,
    { caseKey: createdCase.case_key },
  );
}
