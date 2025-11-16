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
 * Validate that an authenticated adminUser can retrieve a specific moderation
 * case by its business-level case_key after creating it.
 *
 * High level flow:
 *
 * 1. Create and authenticate a fresh adminUser via join.
 * 2. Using that authenticated context, create a moderation case with a known
 *    case_key and core fields.
 * 3. Retrieve the case by GET
 *    /communityPlatform/adminUser/moderationCases/{caseKey}.
 * 4. Assert that the retrieved case matches what was created and that creator
 *    information is wired to the adminUser who opened the case.
 */
export async function test_api_moderation_case_retrieval_by_creator_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an adminUser
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorizedAdmin);

  // 2. Create a moderation case using that admin context
  const caseKey = `case-${RandomGenerator.alphaNumeric(12)}`;
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const description: string | null = RandomGenerator.paragraph({
    sentences: 6,
  });
  const statusOptions = ["open", "in_review", "resolved", "archived"] as const;
  const priorityOptions = ["low", "medium", "high", "urgent"] as const;
  const status = RandomGenerator.pick(statusOptions);
  const priority = RandomGenerator.pick(priorityOptions);

  const createBody = {
    case_key: caseKey,
    title,
    description,
    status,
    priority,
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  // 3. Retrieve the case via GET /communityPlatform/adminUser/moderationCases/{caseKey}
  const retrievedCase =
    await api.functional.communityPlatform.adminUser.moderationCases.at(
      connection,
      {
        caseKey,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(retrievedCase);

  // 4. Core equality assertions between created and retrieved records
  TestValidator.equals(
    "id should be stable between create and get",
    retrievedCase.id,
    createdCase.id,
  );
  TestValidator.equals(
    "case_key should match input",
    retrievedCase.case_key,
    caseKey,
  );
  TestValidator.equals(
    "title should match creation payload",
    retrievedCase.title,
    title,
  );
  TestValidator.equals(
    "description should match creation payload (nullable)",
    retrievedCase.description ?? null,
    description,
  );
  TestValidator.equals(
    "status should match creation payload",
    retrievedCase.status,
    status,
  );
  TestValidator.equals(
    "priority should match creation payload",
    retrievedCase.priority,
    priority,
  );

  // creator_admin wiring
  TestValidator.equals(
    "creator_adminuser_id should equal authorized admin id",
    createdCase.creator_adminuser_id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "retrieved creator_adminuser_id should remain stable",
    retrievedCase.creator_adminuser_id,
    createdCase.creator_adminuser_id,
  );
  TestValidator.equals(
    "creator_admin summary id should match creator_adminuser_id",
    retrievedCase.creator_admin.id,
    retrievedCase.creator_adminuser_id,
  );

  // We cannot know the exact displayName generation rule, but we can assert
  // that it is a non-empty string.
  TestValidator.predicate(
    "creator_admin displayName should be non-empty string",
    typeof retrievedCase.creator_admin.displayName === "string" &&
      retrievedCase.creator_admin.displayName.length > 0,
  );

  // Assignment should remain unassigned as we created with null assigned_adminuser_id
  TestValidator.equals(
    "assigned_adminuser_id should remain null or undefined",
    retrievedCase.assigned_adminuser_id ?? null,
    null,
  );
  TestValidator.equals(
    "assigned_admin summary should be null or undefined",
    retrievedCase.assigned_admin ?? null,
    null,
  );

  // Timestamps and soft-deletion semantics
  TestValidator.predicate(
    "created_at and updated_at should be ISO date-time strings",
    () => {
      const createdAt = new Date(retrievedCase.created_at).getTime();
      const updatedAt = new Date(retrievedCase.updated_at).getTime();
      return (
        !Number.isNaN(createdAt) &&
        !Number.isNaN(updatedAt) &&
        updatedAt >= createdAt
      );
    },
  );

  TestValidator.equals(
    "deleted_at should be null or undefined for active case",
    retrievedCase.deleted_at ?? null,
    null,
  );
}
