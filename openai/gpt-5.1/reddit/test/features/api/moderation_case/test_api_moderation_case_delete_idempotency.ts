import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_delete_idempotency(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain an authorized moderation context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case that will be deleted
  const createBody = {
    case_key: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "medium",
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

  TestValidator.equals(
    "created moderation case must reflect requested case_key",
    createdCase.case_key,
    createBody.case_key,
  );

  // 3. First delete attempt must succeed without error (resource removed)
  await api.functional.communityPlatform.adminUser.moderationCases.erase(
    connection,
    {
      caseKey: createdCase.case_key,
    },
  );

  // 4. Second delete attempt on the same caseKey must fail with an error,
  //    demonstrating idempotent semantics from the client perspective.
  await TestValidator.error(
    "second delete on same moderation caseKey must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.erase(
        connection,
        {
          caseKey: createdCase.case_key,
        },
      );
    },
  );
}
