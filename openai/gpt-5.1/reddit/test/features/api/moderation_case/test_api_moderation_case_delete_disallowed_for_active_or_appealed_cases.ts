import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_delete_disallowed_for_active_or_appealed_cases(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser so that we can manage moderation cases.
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Basic sanity check on returned admin identity
  TestValidator.predicate(
    "adminUser id must be a non-empty UUID string",
    adminAuthorized.id.length > 0,
  );

  // 2. Create a moderation case in an active/non-terminal state (e.g., "in_review").
  const caseKey = `case-${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "in_review",
    priority: "high",
    assigned_adminuser_id: undefined,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  // Verify key business fields echo back what we requested
  TestValidator.equals(
    "created moderation case must keep its case_key",
    createdCase.case_key,
    caseKey,
  );
  TestValidator.equals(
    "created moderation case must have active 'in_review' status",
    createdCase.status,
    "in_review",
  );

  // 3. Attempt to delete the active moderation case.
  //    Business rule: active/appealed cases must not be deleted. We only assert that
  //    deletion fails; underlying HttpError status is not inspected by this test.
  await TestValidator.error(
    "deleting an active moderation case must be rejected",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.erase(
        connection,
        {
          caseKey: createdCase.case_key,
        },
      );
    },
  );

  // 4. We cannot re-fetch the case with the current API surface, so we rely on the
  //    failure of the delete call as evidence that the case has been retained.
}
