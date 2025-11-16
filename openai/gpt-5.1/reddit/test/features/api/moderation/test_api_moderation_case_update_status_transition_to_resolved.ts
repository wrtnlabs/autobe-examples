import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_update_status_transition_to_resolved(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser so that admin-only moderation APIs can be used.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create an initial moderation case in an "open" state with high priority.
  const caseKey: string = RandomGenerator.alphaNumeric(12);
  const createBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  // Basic invariants after creation.
  TestValidator.equals(
    "created case_key must match input",
    createdCase.case_key,
    caseKey,
  );
  TestValidator.equals(
    "created status must be open",
    createdCase.status,
    "open",
  );
  TestValidator.equals(
    "created priority must be high",
    createdCase.priority,
    "high",
  );

  const originalCreatedAt: string & tags.Format<"date-time"> =
    createdCase.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdCase.updated_at;

  // 3. Transition the case status from "open" to terminal state "resolved" with a resolution note.
  const resolutionDescription: string = RandomGenerator.paragraph({
    sentences: 6,
  });
  const updateToResolvedBody = {
    status: "resolved",
    description: resolutionDescription,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const resolvedCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: createdCase.case_key,
        body: updateToResolvedBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(resolvedCase);

  // 4. Validate that the case reflects the resolved terminal state correctly.
  TestValidator.equals(
    "resolved case id should match original",
    resolvedCase.id,
    createdCase.id,
  );
  TestValidator.equals(
    "resolved case_key should match original",
    resolvedCase.case_key,
    createdCase.case_key,
  );
  TestValidator.equals(
    "status should transition to resolved",
    resolvedCase.status,
    "resolved",
  );
  TestValidator.equals(
    "description should update to resolution note",
    resolvedCase.description ?? null,
    resolutionDescription,
  );
  TestValidator.equals(
    "created_at should remain constant after resolution",
    resolvedCase.created_at,
    originalCreatedAt,
  );

  const resolvedUpdatedAt: string & tags.Format<"date-time"> =
    resolvedCase.updated_at;

  await TestValidator.predicate(
    "updated_at must advance when transitioning to resolved",
    async () => {
      const original = Date.parse(originalUpdatedAt as string);
      const updated = Date.parse(resolvedUpdatedAt as string);
      return updated > original;
    },
  );

  // 5. Perform a second update that reopens the case, treating it as an allowed business path.
  const reopenedTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const updateToReopenBody = {
    status: "open",
    title: reopenedTitle,
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  const reopenedCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.update(
      connection,
      {
        caseKey: createdCase.case_key,
        body: updateToReopenBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(reopenedCase);

  TestValidator.equals(
    "reopened case status should be open again",
    reopenedCase.status,
    "open",
  );
  TestValidator.equals(
    "reopened case title should reflect latest update",
    reopenedCase.title,
    reopenedTitle,
  );
  TestValidator.equals(
    "reopened case id should still match original",
    reopenedCase.id,
    createdCase.id,
  );
  TestValidator.equals(
    "reopened case_key should still match original",
    reopenedCase.case_key,
    createdCase.case_key,
  );
  TestValidator.equals(
    "reopened created_at should remain constant",
    reopenedCase.created_at,
    originalCreatedAt,
  );

  const reopenedUpdatedAt: string & tags.Format<"date-time"> =
    reopenedCase.updated_at;

  await TestValidator.predicate(
    "updated_at must advance again when reopening the case",
    async () => {
      const firstUpdate = Date.parse(resolvedUpdatedAt as string);
      const secondUpdate = Date.parse(reopenedUpdatedAt as string);
      return secondUpdate > firstUpdate;
    },
  );
}
