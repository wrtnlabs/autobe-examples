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
 * Validate creation of a moderation case with full context and explicit initial
 * assignment.
 *
 * Business flow covered by this test:
 *
 * 1. Primary adminUser joins (registers) and becomes the authenticated actor on
 *    the connection.
 * 2. A second adminUser joins whose id will be used as the assigned_adminuser_id
 *    for the case.
 * 3. The primary adminUser creates a moderation case with:
 *
 *    - Unique case_key
 *    - Descriptive title
 *    - Non-null description
 *    - Explicit status (e.g., "in_review")
 *    - Explicit priority (e.g., "high")
 *    - Assigned_adminuser_id set to the second admin’s id
 * 4. The test asserts that the returned ICommunityPlatformModerationCase:
 *
 *    - Has creator_adminuser_id matching the primary admin’s id
 *    - Has creator_admin summary whose id matches the primary admin’s id
 *    - Has assigned_adminuser_id and assigned_admin matching the second admin
 *    - Has created_at and updated_at populated, and deleted_at remains
 *         null/undefined
 */
export async function test_api_moderation_case_creation_with_full_metadata_and_assignment(
  connection: api.IConnection,
) {
  // 1. Primary adminUser joins and becomes the authenticated actor
  const primaryJoinRequest = {
    username: `primary_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const primaryAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: primaryJoinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(primaryAdmin);

  // 2. Second adminUser joins (assignee)
  const assigneeJoinRequest = {
    username: `assignee_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const assigneeAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: assigneeJoinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(assigneeAdmin);

  // 3. Primary admin creates a moderation case with full context and assignment
  const caseKey = `CASE-${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "in_review",
    priority: "high",
    assigned_adminuser_id: assigneeAdmin.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );

  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  // 4. Assert creator relationships
  TestValidator.equals(
    "creator_adminuser_id should equal primary admin id",
    createdCase.creator_adminuser_id,
    primaryAdmin.id,
  );

  TestValidator.equals(
    "creator_admin summary id should equal primary admin id",
    createdCase.creator_admin.id,
    primaryAdmin.id,
  );

  // 5. Assert assignee relationships
  TestValidator.predicate(
    "assigned_adminuser_id should be non-null and match assignee id",
    createdCase.assigned_adminuser_id !== null &&
      createdCase.assigned_adminuser_id !== undefined &&
      createdCase.assigned_adminuser_id === assigneeAdmin.id,
  );

  TestValidator.predicate(
    "assigned_admin summary should be present and its id should match assignee id",
    createdCase.assigned_admin !== null &&
      createdCase.assigned_admin !== undefined &&
      createdCase.assigned_admin.id === assigneeAdmin.id,
  );

  // 6. Assert timestamps and soft delete field
  TestValidator.predicate(
    "created_at must be a non-empty string",
    typeof createdCase.created_at === "string" &&
      createdCase.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty string",
    typeof createdCase.updated_at === "string" &&
      createdCase.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at must be null or undefined right after creation",
    createdCase.deleted_at === null || createdCase.deleted_at === undefined,
  );
}
