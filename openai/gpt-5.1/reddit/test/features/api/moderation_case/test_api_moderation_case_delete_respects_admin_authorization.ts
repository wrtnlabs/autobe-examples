import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_delete_respects_admin_authorization(
  connection: api.IConnection,
) {
  // Join as an adminUser to obtain an authenticated admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1n!Password" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // Create a moderation case as this authenticated adminUser
  const createBody = {
    case_key: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  // Build an unauthenticated connection to simulate missing Authorization
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to delete using unauthenticated connection - must fail
  await TestValidator.error(
    "unauthenticated deletion of moderation case should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.erase(
        unauthenticated,
        { caseKey: createdCase.case_key },
      );
    },
  );

  // Delete using the authenticated admin connection - must succeed
  await api.functional.communityPlatform.adminUser.moderationCases.erase(
    connection,
    { caseKey: createdCase.case_key },
  );
}
