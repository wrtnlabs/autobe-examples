import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline moderation case with explicit values
  const caseKey = RandomGenerator.alphaNumeric(16);
  const originalCreateBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "open",
    priority: "medium",
    // Leave unassigned initially to exercise null behavior
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const original: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: originalCreateBody,
      },
    );
  typia.assert(original);

  // Capture original references for comparison
  const originalId = original.id;
  const originalCaseKey = original.case_key;
  const originalTitle = original.title;
  const originalDescription = original.description ?? null;
  const originalStatus = original.status;
  const originalPriority = original.priority;
  const originalCreatorAdminId = original.creator_adminuser_id;
  const originalAssignedAdminId =
    original.assigned_adminuser_id === undefined
      ? null
      : original.assigned_adminuser_id;
  const originalMetadata = original.metadata;
  const originalCreatedAt = original.created_at;
  const originalUpdatedAt = original.updated_at;
  const originalDeletedAt =
    original.deleted_at === undefined ? null : original.deleted_at;

  // 3. First partial update: change only priority
  const newPriority = originalPriority === "medium" ? "high" : "medium";
  const firstUpdateBody = {
    priority: newPriority,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const afterPriorityUpdate: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: originalCaseKey,
        body: firstUpdateBody,
      },
    );
  typia.assert(afterPriorityUpdate);

  // Validate changed priority
  TestValidator.equals(
    "priority should be updated in first partial update",
    afterPriorityUpdate.priority,
    newPriority,
  );

  // Validate unchanged mutable fields
  TestValidator.equals(
    "title should remain unchanged after first partial update",
    afterPriorityUpdate.title,
    originalTitle,
  );
  TestValidator.equals(
    "status should remain unchanged after first partial update",
    afterPriorityUpdate.status,
    originalStatus,
  );
  TestValidator.equals(
    "description should remain unchanged after first partial update",
    afterPriorityUpdate.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "assigned_adminuser_id should remain unchanged after first partial update",
    afterPriorityUpdate.assigned_adminuser_id === undefined
      ? null
      : afterPriorityUpdate.assigned_adminuser_id,
    originalAssignedAdminId,
  );

  // Validate system-managed fields stay stable
  TestValidator.equals(
    "id must remain stable after first partial update",
    afterPriorityUpdate.id,
    originalId,
  );
  TestValidator.equals(
    "case_key must remain stable after first partial update",
    afterPriorityUpdate.case_key,
    originalCaseKey,
  );
  TestValidator.equals(
    "creator_adminuser_id must remain stable after first partial update",
    afterPriorityUpdate.creator_adminuser_id,
    originalCreatorAdminId,
  );
  TestValidator.equals(
    "created_at must remain stable after first partial update",
    afterPriorityUpdate.created_at,
    originalCreatedAt,
  );

  // deleted_at should not be touched by update
  TestValidator.equals(
    "deleted_at must remain unchanged after first partial update",
    afterPriorityUpdate.deleted_at === undefined
      ? null
      : afterPriorityUpdate.deleted_at,
    originalDeletedAt,
  );

  // updated_at should advance
  TestValidator.notEquals(
    "updated_at must change after first partial update",
    afterPriorityUpdate.updated_at,
    originalUpdatedAt,
  );

  // 4. Second partial update: change only description
  const newDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const secondUpdateBody = {
    description: newDescription,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const afterDescriptionUpdate: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: originalCaseKey,
        body: secondUpdateBody,
      },
    );
  typia.assert(afterDescriptionUpdate);

  // Validate description changed
  TestValidator.equals(
    "description should be updated in second partial update",
    afterDescriptionUpdate.description ?? null,
    newDescription,
  );

  // Priority should remain as set by first update
  TestValidator.equals(
    "priority should remain as updated by first partial update",
    afterDescriptionUpdate.priority,
    newPriority,
  );

  // Other mutable fields unchanged
  TestValidator.equals(
    "title should remain unchanged after second partial update",
    afterDescriptionUpdate.title,
    originalTitle,
  );
  TestValidator.equals(
    "status should remain unchanged after second partial update",
    afterDescriptionUpdate.status,
    originalStatus,
  );
  TestValidator.equals(
    "assigned_adminuser_id should remain unchanged after second partial update",
    afterDescriptionUpdate.assigned_adminuser_id === undefined
      ? null
      : afterDescriptionUpdate.assigned_adminuser_id,
    originalAssignedAdminId,
  );

  // System-managed fields stable
  TestValidator.equals(
    "id must remain stable after second partial update",
    afterDescriptionUpdate.id,
    originalId,
  );
  TestValidator.equals(
    "case_key must remain stable after second partial update",
    afterDescriptionUpdate.case_key,
    originalCaseKey,
  );
  TestValidator.equals(
    "creator_adminuser_id must remain stable after second partial update",
    afterDescriptionUpdate.creator_adminuser_id,
    originalCreatorAdminId,
  );
  TestValidator.equals(
    "created_at must remain stable after second partial update",
    afterDescriptionUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at must remain unchanged after second partial update",
    afterDescriptionUpdate.deleted_at === undefined
      ? null
      : afterDescriptionUpdate.deleted_at,
    originalDeletedAt,
  );

  // updated_at should advance again compared to afterPriorityUpdate
  TestValidator.notEquals(
    "updated_at must change again after second partial update",
    afterDescriptionUpdate.updated_at,
    afterPriorityUpdate.updated_at,
  );
}
