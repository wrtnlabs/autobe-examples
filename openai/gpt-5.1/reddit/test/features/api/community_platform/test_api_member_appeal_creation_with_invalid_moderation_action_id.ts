import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

export async function test_api_member_appeal_creation_with_invalid_moderation_action_id(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Happy path: create an appeal with a valid ICreate payload to ensure endpoint works
  const validCreateBody: ICommunityPlatformAppeal.ICreate =
    typia.random<ICommunityPlatformAppeal.ICreate>();
  const validAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: validCreateBody,
      },
    );
  typia.assert(validAppeal);

  // 3. Error path: attempt to create an appeal with a non-existent moderation_action_id
  const invalidModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure we are not just reusing the valid id (best-effort; even if equal, backend should still behave consistently)
  await TestValidator.error(
    "creating appeal with non-existent moderation_action_id should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        {
          body: {
            moderation_action_id: invalidModerationActionId,
            justification: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 10,
            }),
          } satisfies ICommunityPlatformAppeal.ICreate,
        },
      );
    },
  );
}
