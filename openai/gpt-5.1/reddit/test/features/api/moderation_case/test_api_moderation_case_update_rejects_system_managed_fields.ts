import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_update_rejects_system_managed_fields(
  connection: api.IConnection,
) {
  // 1. Admin onboarding and authentication
  const joinRequest = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline moderation case
  const createBody = {
    case_key: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "medium",
    // leave assigned_adminuser_id undefined to start unassigned
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const originalCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(originalCase);

  // Basic sanity checks on created case
  TestValidator.predicate(
    "created moderation case should have non-empty case_key",
    !!originalCase.case_key && originalCase.case_key.length > 0,
  );
  TestValidator.predicate(
    "created moderation case should have created_at timestamp",
    !!originalCase.created_at && originalCase.created_at.length > 0,
  );

  // 3. Attempt an update, focusing on allowed mutable fields
  const newTitle: string = RandomGenerator.paragraph({ sentences: 4 });
  const newDescription: string = RandomGenerator.paragraph({ sentences: 8 });
  const newStatus: string = "in_review";
  const newPriority: string = "high";

  const updateBody = {
    title: newTitle,
    description: newDescription,
    status: newStatus,
    priority: newPriority,
    // keep assigned_adminuser_id omitted so it should remain unchanged
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const updatedCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: originalCase.case_key,
        body: updateBody,
      },
    );
  typia.assert(updatedCase);

  // 4. Validate system-managed invariants and allowed mutations
  // System-managed invariants
  TestValidator.equals(
    "update must not change primary key id",
    updatedCase.id,
    originalCase.id,
  );
  TestValidator.equals(
    "update must not change business case_key",
    updatedCase.case_key,
    originalCase.case_key,
  );
  TestValidator.equals(
    "update must not change creator_adminuser_id",
    updatedCase.creator_adminuser_id,
    originalCase.creator_adminuser_id,
  );
  TestValidator.equals(
    "update must not change created_at timestamp",
    updatedCase.created_at,
    originalCase.created_at,
  );

  // Soft deletion field should not be toggled by this update endpoint
  TestValidator.equals(
    "update must not change deleted_at soft deletion marker",
    updatedCase.deleted_at ?? null,
    originalCase.deleted_at ?? null,
  );

  // Allowed mutable fields should reflect the update payload
  TestValidator.equals(
    "title should be updated to new value",
    updatedCase.title,
    newTitle,
  );
  TestValidator.equals(
    "description should be updated to new value",
    updatedCase.description ?? null,
    newDescription,
  );
  TestValidator.equals(
    "status should be updated to new value",
    updatedCase.status,
    newStatus,
  );
  TestValidator.equals(
    "priority should be updated to new value",
    updatedCase.priority,
    newPriority,
  );

  // When assigned_adminuser_id is omitted in update, it should remain stable
  TestValidator.equals(
    "assigned_adminuser_id should remain unchanged when omitted in update",
    updatedCase.assigned_adminuser_id ?? null,
    originalCase.assigned_adminuser_id ?? null,
  );

  // 5. Optional second update verifying partial update semantics
  const secondStatus: string = "resolved";
  const secondUpdateBody = {
    status: secondStatus,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const secondUpdatedCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: originalCase.case_key,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedCase);

  // System-managed fields must still be stable
  TestValidator.equals(
    "second update must not change primary key id",
    secondUpdatedCase.id,
    originalCase.id,
  );
  TestValidator.equals(
    "second update must not change business case_key",
    secondUpdatedCase.case_key,
    originalCase.case_key,
  );
  TestValidator.equals(
    "second update must not change creator_adminuser_id",
    secondUpdatedCase.creator_adminuser_id,
    originalCase.creator_adminuser_id,
  );
  TestValidator.equals(
    "second update must not change created_at timestamp",
    secondUpdatedCase.created_at,
    originalCase.created_at,
  );
  TestValidator.equals(
    "second update must not change deleted_at",
    secondUpdatedCase.deleted_at ?? null,
    originalCase.deleted_at ?? null,
  );

  // Fields not provided in second update should carry forward previous values
  TestValidator.equals(
    "title should remain from first update when not changed again",
    secondUpdatedCase.title,
    updatedCase.title,
  );
  TestValidator.equals(
    "description should remain from first update when not changed again",
    secondUpdatedCase.description ?? null,
    updatedCase.description ?? null,
  );
  TestValidator.equals(
    "priority should remain from first update when not changed again",
    secondUpdatedCase.priority,
    updatedCase.priority,
  );
  TestValidator.equals(
    "assigned_adminuser_id should remain unchanged across updates when not set",
    secondUpdatedCase.assigned_adminuser_id ?? null,
    originalCase.assigned_adminuser_id ?? null,
  );

  // Status should reflect the second update
  TestValidator.equals(
    "status should reflect second update payload",
    secondUpdatedCase.status,
    secondStatus,
  );
}
