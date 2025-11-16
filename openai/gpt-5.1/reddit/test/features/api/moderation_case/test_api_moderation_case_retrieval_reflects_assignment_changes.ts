import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_retrieval_reflects_assignment_changes(
  connection: api.IConnection,
) {
  // 1. Primary admin joins (creator of the moderation case)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const creatorAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(creatorAdmin);

  // 2. Create an initial moderation case (unassigned, open, medium priority)
  const caseKey: string = RandomGenerator.alphaNumeric(16);
  const initialStatus = "open";
  const initialPriority = "medium";

  const createBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: initialStatus,
    priority: initialPriority,
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCase);

  // 3. Create a second admin to assign the case to
  const assigneeJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const assigneeAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: assigneeJoinBody,
    });
  typia.assert(assigneeAdmin);

  const assigneeAdminId = assigneeAdmin.id;

  // 4. Update the moderation case by caseKey: change status, priority, assignment, and title/description
  const updatedStatus = "in_review";
  const updatedPriority = "high";
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    status: updatedStatus,
    priority: updatedPriority,
    assigned_adminuser_id: assigneeAdminId,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const updatedCaseFromPut: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: createdCase.case_key,
        body: updateBody,
      },
    );
  typia.assert(updatedCaseFromPut);

  // 5. Retrieve the moderation case via GET by caseKey
  const fetchedCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.at(
      connection,
      {
        caseKey: createdCase.case_key,
      },
    );
  typia.assert(fetchedCase);

  // 6. Assertions & validations

  // Identity and key consistency
  TestValidator.equals(
    "case key is consistent between created and fetched case",
    fetchedCase.case_key,
    createdCase.case_key,
  );
  TestValidator.equals(
    "case id is stable between created and fetched case",
    fetchedCase.id,
    createdCase.id,
  );

  // Updated mutable fields reflect latest values
  TestValidator.equals(
    "status reflects updated value",
    fetchedCase.status,
    updatedStatus,
  );
  TestValidator.notEquals(
    "status changed from initial value",
    fetchedCase.status,
    initialStatus,
  );

  TestValidator.equals(
    "priority reflects updated value",
    fetchedCase.priority,
    updatedPriority,
  );
  TestValidator.notEquals(
    "priority changed from initial value",
    fetchedCase.priority,
    initialPriority,
  );

  TestValidator.equals(
    "assigned_adminuser_id matches assignee admin id",
    fetchedCase.assigned_adminuser_id ?? null,
    assigneeAdminId,
  );

  TestValidator.predicate(
    "assigned_admin summary is present after assignment",
    fetchedCase.assigned_admin !== null &&
      fetchedCase.assigned_admin !== undefined,
  );

  if (
    fetchedCase.assigned_admin !== null &&
    fetchedCase.assigned_admin !== undefined
  ) {
    TestValidator.equals(
      "assigned_admin summary id matches assignee admin id",
      fetchedCase.assigned_admin.id,
      assigneeAdminId,
    );
  }

  // Title and description updated
  TestValidator.equals(
    "title reflects updated value",
    fetchedCase.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description reflects updated value",
    fetchedCase.description ?? null,
    updatedDescription,
  );

  // Metadata consistency between PUT and GET (if any)
  TestValidator.equals<
    ICommunityPlatformModerationCaseMetadata | undefined | null
  >(
    "metadata is consistent between PUT response and GET response",
    fetchedCase.metadata ?? undefined,
    updatedCaseFromPut.metadata ?? undefined,
  );

  // created_at and updated_at behavior
  TestValidator.equals(
    "created_at is stable between created and fetched case",
    fetchedCase.created_at,
    createdCase.created_at,
  );

  TestValidator.equals(
    "created_at is stable between created and updated case",
    updatedCaseFromPut.created_at,
    createdCase.created_at,
  );

  TestValidator.equals(
    "updated_at is consistent between PUT and GET responses",
    fetchedCase.updated_at,
    updatedCaseFromPut.updated_at,
  );

  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    fetchedCase.updated_at >= fetchedCase.created_at,
  );

  TestValidator.notEquals(
    "updated_at changed after update compared to initial created case",
    updatedCaseFromPut.updated_at,
    createdCase.updated_at,
  );

  // Soft-delete behavior: case should not be soft-deleted
  TestValidator.predicate(
    "deleted_at is null or undefined (no soft-delete applied)",
    fetchedCase.deleted_at === null || fetchedCase.deleted_at === undefined,
  );

  // Full object consistency between PUT response and GET response
  TestValidator.equals(
    "entire moderation case matches between PUT and subsequent GET",
    fetchedCase,
    updatedCaseFromPut,
  );
}
