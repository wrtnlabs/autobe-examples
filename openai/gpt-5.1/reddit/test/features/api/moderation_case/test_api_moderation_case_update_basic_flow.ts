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
 * Validate the basic happy-path workflow of updating a moderation case by
 * caseKey.
 *
 * Business goals:
 *
 * - Ensure that an authenticated adminUser can create a moderation case and then
 *   update its mutable fields.
 * - Verify that immutable identity/ownership fields of the moderation case are
 *   preserved across the update.
 * - Confirm the updated_at timestamp is refreshed on update while created_at
 *   remains unchanged.
 *
 * Scenario outline:
 *
 * 1. Admin join & authentication
 *
 *    - Call api.functional.auth.adminUser.join with a valid
 *         ICommunityPlatformAdminUserJoin.IRequest payload.
 *    - This should create a new admin user and automatically configure connection
 *         headers with the adminUser access token.
 *    - Assert the returned ICommunityPlatformAdminuser.IAuthorized structure with
 *         typia.assert.
 * 2. Create baseline moderation case
 *
 *    - Using the authenticated admin connection, call
 *         api.functional.communityPlatform.adminUser.moderationCases.create
 *         with body: ICommunityPlatformModerationCase.ICreate.
 *    - Provide:
 *
 *         - Case_key: deterministic or random but human-readable key.
 *         - Title: some short string.
 *         - Description: a non-empty string (optional but present in this flow).
 *         - Status: "open".
 *         - Priority: "medium".
 *         - Assigned_adminuser_id: the id of the same admin who just joined (to test
 *                   assignment but keep it unchanged on update).
 *    - Assert the response as ICommunityPlatformModerationCase using typia.assert.
 *    - Capture important fields: id, case_key, creator_adminuser_id,
 *         assigned_adminuser_id, created_at, updated_at, metadata,
 *         assigned_admin, creator_admin.
 * 3. Update the moderation case via caseKey
 *
 *    - Call api.functional.communityPlatform.adminUser.moderationCases.update with:
 *
 *         - CaseKey: the case_key captured from the create step.
 *         - Body: ICommunityPlatformModerationCase.IUpdate containing:
 *
 *                           - Title: a NEW title (different from original).
 *                           - Description: a NEW description (different from original, non-empty).
 *                           - Priority: a NEW priority string (e.g., "high") different from original.
 *                           - Status: omitted in this test or kept as "open" depending on feasibility.
 *                                               According to the scenario, status
 *                                               should remain "open", so we simply omit
 *                                               status in the update payload to let the
 *                                               backend preserve its original value.
 *                           - Assigned_adminuser_id: omitted so assignment remains unchanged.
 *    - Assert the update response with typia.assert as
 *         ICommunityPlatformModerationCase.
 * 4. Validate field behavior after update
 *
 *    - Using TestValidator.equals / notEquals / predicate with descriptive titles:
 *
 *         - Immutable identity & ownership fields must be unchanged:
 *
 *                           - Id stays the same.
 *                           - Case_key stays the same.
 *                           - Creator_adminuser_id stays the same.
 *                           - Assigned_adminuser_id stays the same (because we did not change it).
 *         - Creator/assignee summary objects are logically consistent:
 *
 *                           - Creator_admin.id equals creator_adminuser_id.
 *                           - If assigned_admin is non-null, assigned_admin.id equals
 *                                               assigned_adminuser_id.
 *         - Mutable fields reflect new values:
 *
 *                           - Title equals new title.
 *                           - Description equals new description (taking into account description may be
 *                                               string | null | undefined on the main
 *                                               type).
 *                           - Priority equals new priority.
 *         - Status remains "open":
 *
 *                           - Validate that updatedCase.status equals originalCase.status and equals
 *                         "open".
 *         - Timestamp semantics:
 *
 *                           - Created_at is unchanged between original and updated cases.
 *                           - Updated_at is different from the original and chronologically not earlier
 *                                               than original updated_at. Since we only
 *                                               have string & tags.Format<"date-time">,
 *                                               parse them with Date to compare
 *                                               ordering.
 * 5. (Optional) No dedicated GET endpoint is provided in the SDK list, so skip
 *    explicit re-fetch.
 *
 *    - The update response is treated as the persisted state and used for
 *         validations.
 *
 * Type-specific notes:
 *
 * - Use typia.random<string & tags.Format<"email">>() for admin email and
 *   `RandomGenerator.name` / `RandomGenerator.paragraph` for human-readable
 *   fields.
 * - Use `satisfies` when constructing request bodies
 *   (ICommunityPlatformAdminUserJoin.IRequest and
 *   ICommunityPlatformModerationCase.ICreate/IUpdate), avoiding any `as`
 *   casts.
 * - Handle nullable/optional fields like description and assigned_adminuser_id
 *   carefully, respecting their unions (string | null | undefined, (uuid) |
 *   null | undefined).
 */
export async function test_api_moderation_case_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuth = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuth);

  // 2. Create baseline moderation case
  const initialCaseKey = `CASE-${RandomGenerator.alphaNumeric(8)}`;
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 6 });

  const createBody = {
    case_key: initialCaseKey,
    title: initialTitle,
    description: initialDescription,
    status: "open",
    priority: "medium",
    assigned_adminuser_id: adminAuth.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  // Capture original fields for later comparison
  const originalId = createdCase.id;
  const originalCaseKey = createdCase.case_key;
  const originalCreatorAdminUserId = createdCase.creator_adminuser_id;
  const originalAssignedAdminUserId = createdCase.assigned_adminuser_id;
  const originalStatus = createdCase.status;
  const originalPriority = createdCase.priority;
  const originalCreatedAt = createdCase.created_at;
  const originalUpdatedAt = createdCase.updated_at;

  // 3. Update moderation case by caseKey
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 8 });
  const updatedPriority = "high";

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    priority: updatedPriority,
    // status omitted intentionally so it remains "open"
    // assigned_adminuser_id omitted so assignment remains unchanged
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const updatedCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: originalCaseKey,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(updatedCase);

  // 4. Validate field behavior after update
  // 4-1. Immutable identity and ownership fields
  TestValidator.equals(
    "moderation case id should remain unchanged after update",
    updatedCase.id,
    originalId,
  );

  TestValidator.equals(
    "moderation case_key should remain unchanged after update",
    updatedCase.case_key,
    originalCaseKey,
  );

  TestValidator.equals(
    "creator_adminuser_id should remain unchanged after update",
    updatedCase.creator_adminuser_id,
    originalCreatorAdminUserId,
  );

  TestValidator.equals(
    "assigned_adminuser_id should remain unchanged when not updated",
    updatedCase.assigned_adminuser_id ?? null,
    originalAssignedAdminUserId ?? null,
  );

  // 4-2. Creator and assignee summary consistency
  TestValidator.equals(
    "creator_admin summary id should match creator_adminuser_id",
    updatedCase.creator_admin.id,
    updatedCase.creator_adminuser_id,
  );

  if (
    updatedCase.assigned_adminuser_id !== null &&
    updatedCase.assigned_adminuser_id !== undefined &&
    updatedCase.assigned_admin !== null &&
    updatedCase.assigned_admin !== undefined
  ) {
    TestValidator.equals(
      "assigned_admin summary id should match assigned_adminuser_id when present",
      updatedCase.assigned_admin.id,
      updatedCase.assigned_adminuser_id,
    );
  }

  // 4-3. Mutable fields reflect new values
  TestValidator.equals(
    "title should be updated to new value",
    updatedCase.title,
    updatedTitle,
  );

  TestValidator.equals(
    "description should be updated to new value",
    updatedCase.description ?? null,
    updatedDescription,
  );

  TestValidator.equals(
    "priority should be updated to new value",
    updatedCase.priority,
    updatedPriority,
  );

  // 4-4. Status remains open (unchanged)
  TestValidator.equals(
    "status should remain unchanged as 'open' after update when not provided",
    updatedCase.status,
    originalStatus,
  );

  TestValidator.equals(
    "status should still be 'open' after update",
    updatedCase.status,
    "open",
  );

  // 4-5. Timestamp semantics
  TestValidator.equals(
    "created_at timestamp should remain unchanged after update",
    updatedCase.created_at,
    originalCreatedAt,
  );

  // Ensure updated_at has advanced (string date-time comparison via Date)
  const originalUpdatedAtDate = new Date(originalUpdatedAt);
  const updatedUpdatedAtDate = new Date(updatedCase.updated_at);

  TestValidator.predicate(
    "updated_at should differ from original updated_at after update",
    updatedCase.updated_at !== originalUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at should be chronologically not earlier than original updated_at",
    updatedUpdatedAtDate.getTime() >= originalUpdatedAtDate.getTime(),
  );
}
