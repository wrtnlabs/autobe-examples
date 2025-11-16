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
 * Verify that moderation case creation enforces uniqueness of `case_key`.
 *
 * Business goal:
 *
 * - Ensure that attempting to create a second active moderation case with the
 *   same `case_key` fails, honoring the unique index on `case_key` in
 *   `community_platform_moderation_cases`.
 *
 * End-to-end flow:
 *
 * 1. Join an adminUser via /auth/adminUser/join, receiving an authorized admin
 *    context and JWT token (handled automatically by the SDK).
 * 2. Using this authenticated admin connection, create a moderation case via
 *    /communityPlatform/adminUser/moderationCases with a chosen `case_key` and
 *    valid `title`, `status`, and `priority` (and optional fields).
 * 3. In the same test and same authenticated context, attempt to create a second
 *    moderation case with the identical `case_key`.
 * 4. Assert that the first creation succeeds and returns a valid
 *    ICommunityPlatformModerationCase, and that the second creation attempt
 *    throws an error, indicating a uniqueness violation.
 * 5. Optionally, confirm that the original case object remains unchanged in memory
 *    (e.g., `case_key`, `title`, `status`, `priority`, `creator_adminuser_id`,
 *    timestamps) after the failed second attempt.
 */
export async function test_api_moderation_case_creation_enforces_case_key_uniqueness(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to get authenticated admin context
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

  // 2. Create a first moderation case with a specific case_key
  const caseKey: string = RandomGenerator.alphaNumeric(16);

  const createBody1 = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const firstCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody1,
      },
    );
  typia.assert(firstCase);

  // Basic sanity checks on the first created case
  TestValidator.equals(
    "first case should preserve case_key",
    firstCase.case_key,
    caseKey,
  );
  TestValidator.equals(
    "first case should preserve title",
    firstCase.title,
    createBody1.title,
  );
  TestValidator.equals(
    "first case should preserve status",
    firstCase.status,
    createBody1.status,
  );
  TestValidator.equals(
    "first case should preserve priority",
    firstCase.priority,
    createBody1.priority,
  );
  TestValidator.equals(
    "creator_adminuser_id should match joined admin id",
    firstCase.creator_adminuser_id,
    adminAuthorized.id,
  );

  // 3. Attempt to create another moderation case with the same case_key
  const createBody2 = {
    case_key: caseKey, // intentionally identical to createBody1.case_key
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  await TestValidator.error(
    "creating a second moderation case with duplicate case_key should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.create(
        connection,
        {
          body: createBody2,
        },
      );
    },
  );

  // 4. Confirm that the firstCase object remains unchanged in memory
  TestValidator.equals(
    "first case still has original case_key after failed duplicate creation",
    firstCase.case_key,
    caseKey,
  );
  TestValidator.equals(
    "first case still has original title after failed duplicate creation",
    firstCase.title,
    createBody1.title,
  );
  TestValidator.equals(
    "first case still has original status after failed duplicate creation",
    firstCase.status,
    createBody1.status,
  );
  TestValidator.equals(
    "first case still has original priority after failed duplicate creation",
    firstCase.priority,
    createBody1.priority,
  );
}
