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
 * Validate reassignment of a moderation case from one adminUser to another.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Join as Admin A via auth.adminUser.join, capturing Admin A's identity (id,
 *    username, email, is_super_admin) from the authorized context.
 * 2. Join as Admin B via auth.adminUser.join. The shared connection is now
 *    authenticated as Admin B, who will act as the moderation actor for the
 *    rest of the scenario.
 * 3. Under Admin B’s authorization, create a moderation case using
 *    communityPlatform.adminUser.moderationCases.create with
 *    assigned_adminuser_id set to Admin B’s id so the case starts assigned to
 *    its creator.
 * 4. Still under Admin B, call communityPlatform.adminUser.moderationCases.update
 *    with caseKey equal to the created case’s case_key and an
 *    ICommunityPlatformModerationCase.IUpdate body that only changes
 *    assigned_adminuser_id to Admin A’s id.
 * 5. Validate that the updated moderation case now has assigned_adminuser_id and
 *    assigned_admin.id equal to Admin A’s id, while all other business fields
 *    remain unchanged and updated_at is bumped.
 */
export async function test_api_moderation_case_update_assignment_reassignment(
  connection: api.IConnection,
) {
  // 1. Join as Admin A (will not remain the acting principal, but we need its id)
  const adminAJoinRequest = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminA!pass1",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinRequest,
    });
  typia.assert(adminA);

  // 2. Join as Admin B - this becomes the acting admin for create/update
  const adminBJoinRequest = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminB!pass1",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinRequest,
    });
  typia.assert(adminB);

  // 3. Create a moderation case initially assigned to Admin B (the acting admin)
  const caseKey: string = `CASE-${RandomGenerator.alphaNumeric(8)}`;
  const title: string = RandomGenerator.paragraph({ sentences: 3 });
  const description: string = RandomGenerator.paragraph({ sentences: 6 });
  const status: string = "open";
  const priority: string = "medium";

  const createBody = {
    case_key: caseKey,
    title,
    description,
    status,
    priority,
    assigned_adminuser_id: adminB.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const created: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Snapshot original state for comparison
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalCreatorAdminUserId = created.creator_adminuser_id;
  const originalCreatorAdmin = created.creator_admin;
  const originalCaseKey = created.case_key;
  const originalTitle = created.title;
  const originalDescription = created.description ?? null;
  const originalStatus = created.status;
  const originalPriority = created.priority;
  const originalAssignedAdminUserId = created.assigned_adminuser_id ?? null;
  const originalAssignedAdmin = created.assigned_admin ?? null;

  TestValidator.equals(
    "case should be initially assigned to Admin B",
    created.assigned_adminuser_id,
    adminB.id,
  );

  if (created.assigned_admin !== undefined && created.assigned_admin !== null) {
    TestValidator.equals(
      "assigned_admin summary should correspond to Admin B",
      created.assigned_admin.id,
      adminB.id,
    );
  }

  // 4. Reassign case to Admin A via update
  const updateBody = {
    assigned_adminuser_id: adminA.id,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const updated: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: created.case_key,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validations: reassignment and field stability
  TestValidator.equals(
    "assigned_adminuser_id should be updated to Admin A",
    updated.assigned_adminuser_id,
    adminA.id,
  );

  TestValidator.predicate(
    "assigned_admin summary should be non-null after reassignment",
    updated.assigned_admin !== undefined && updated.assigned_admin !== null,
  );

  if (updated.assigned_admin !== undefined && updated.assigned_admin !== null) {
    TestValidator.equals(
      "assigned_admin summary id should be Admin A",
      updated.assigned_admin.id,
      adminA.id,
    );
  }

  // Core scalar and relational fields must remain unchanged
  TestValidator.equals(
    "case_key should remain unchanged",
    updated.case_key,
    originalCaseKey,
  );
  TestValidator.equals(
    "title should remain unchanged",
    updated.title,
    originalTitle,
  );
  TestValidator.equals(
    "description should remain unchanged",
    updated.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updated.status,
    originalStatus,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    updated.priority,
    originalPriority,
  );
  TestValidator.equals(
    "creator_adminuser_id should remain unchanged",
    updated.creator_adminuser_id,
    originalCreatorAdminUserId,
  );

  TestValidator.equals(
    "creator_admin summary should remain unchanged",
    updated.creator_admin,
    originalCreatorAdmin,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  // updated_at must change after the update
  TestValidator.notEquals(
    "updated_at should change after reassignment",
    updated.updated_at,
    originalUpdatedAt,
  );

  // Sanity check: previous assignment snapshot differs from new one
  TestValidator.notEquals(
    "assigned_adminuser_id should differ from original after reassignment",
    updated.assigned_adminuser_id,
    originalAssignedAdminUserId,
  );

  if (originalAssignedAdmin !== null && updated.assigned_admin !== null) {
    TestValidator.notEquals(
      "assigned_admin summary should differ from original after reassignment",
      updated.assigned_admin,
      originalAssignedAdmin,
    );
  }
}
