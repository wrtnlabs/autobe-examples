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
 * Validate creation of a moderation case with minimal required fields.
 *
 * Business goal: Ensure that an authenticated adminUser can open a new
 * moderation case in the community platform by supplying only the required
 * fields defined in ICommunityPlatformModerationCase.ICreate. The created case
 * must correctly link back to the creating admin, respect default/nullable
 * semantics for optional fields, and expose timestamps and soft-delete state as
 * expected.
 *
 * Steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join using
 *    ICommunityPlatformAdminUserJoin.IRequest, and obtain the
 *    ICommunityPlatformAdminuser.IAuthorized response. The SDK will
 *    automatically apply the returned access token onto the shared connection
 *    headers.
 * 2. Call POST /communityPlatform/adminUser/moderationCases using
 *    api.functional.communityPlatform.adminUser.moderationCases.create with a
 *    request body that satisfies ICommunityPlatformModerationCase.ICreate and
 *    only sets the required fields: `case_key`, `title`, `status`, and
 *    `priority`. Do not include `description` or `assigned_adminuser_id` to
 *    simulate minimal input.
 * 3. Assert that the response is a valid ICommunityPlatformModerationCase using
 *    typia.assert, then perform logical validations with TestValidator to
 *    ensure:
 *
 *    - The `case_key`, `title`, `status`, and `priority` echo the input.
 *    - `creator_adminuser_id` matches the id from the authorized adminUser.
 *    - `creator_admin.id` equals `creator_adminuser_id` and
 *         `creator_admin.displayName` is a non-empty string.
 *    - `assigned_adminuser_id` and `assigned_admin` are either null or undefined
 *         (unassigned state).
 *    - `created_at` and `updated_at` are non-empty strings (the backend already
 *         guarantees correct format via typia.assert).
 *    - `deleted_at` is null or undefined (active, not soft-deleted).
 *
 * Note: The high-level scenario mentions an optional GET by caseKey to confirm
 * persistence, but no such endpoint exists in the provided SDK, so this test
 * focuses solely on the create flow and response validation.
 */
export async function test_api_moderation_case_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create moderation case with minimal required fields
  const caseKey: string = `case-${RandomGenerator.alphaNumeric(12)}`;
  const title: string = RandomGenerator.paragraph({ sentences: 3 });
  const status: string = "open";
  const priority: string = "medium";

  const createBody = {
    case_key: caseKey,
    title,
    status,
    priority,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCase);

  // 3. Core field echo validations
  TestValidator.equals(
    "created case_key should echo input",
    createdCase.case_key,
    caseKey,
  );
  TestValidator.equals(
    "created title should echo input",
    createdCase.title,
    title,
  );
  TestValidator.equals(
    "created status should echo input",
    createdCase.status,
    status,
  );
  TestValidator.equals(
    "created priority should echo input",
    createdCase.priority,
    priority,
  );

  // 4. Creator linkage validations
  TestValidator.equals(
    "creator_adminuser_id should match authorized admin id",
    createdCase.creator_adminuser_id,
    authorizedAdmin.id,
  );

  TestValidator.equals(
    "creator_admin.id should match creator_adminuser_id",
    createdCase.creator_admin.id,
    createdCase.creator_adminuser_id,
  );

  TestValidator.predicate(
    "creator_admin.displayName should be a non-empty string",
    createdCase.creator_admin.displayName.length > 0,
  );

  // 5. Assignment and soft-delete semantics
  TestValidator.predicate(
    "assigned_adminuser_id should be null or undefined when not provided",
    createdCase.assigned_adminuser_id === null ||
      createdCase.assigned_adminuser_id === undefined,
  );

  TestValidator.predicate(
    "assigned_admin should be null or undefined when not provided",
    createdCase.assigned_admin === null ||
      createdCase.assigned_admin === undefined,
  );

  TestValidator.predicate(
    "created_at should be a non-empty string",
    createdCase.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    createdCase.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for an active case",
    createdCase.deleted_at === null || createdCase.deleted_at === undefined,
  );
}
