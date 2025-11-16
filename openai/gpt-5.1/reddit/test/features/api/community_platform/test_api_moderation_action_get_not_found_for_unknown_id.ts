import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_action_get_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized adminUser context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Optionally create a moderation case for a realistic environment.
  const moderationCaseBody = {
    case_key: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Optionally create a valid moderation action linked to the case.
  const moderationActionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "warn_user",
    scope: "user",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(createdAction);

  // 4. Generate a UUID that is very unlikely to match any existing moderation action.
  let unknownModerationActionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownModerationActionId === createdAction.id) {
    // Regenerate once in the extremely unlikely event of a collision.
    unknownModerationActionId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Call GET /communityPlatform/adminUser/moderationActions/{moderationActionId}
  //    with the unknown ID, and assert that it results in an error.
  await TestValidator.error(
    "unknown moderationActionId should result in error",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.at(
        connection,
        {
          moderationActionId: unknownModerationActionId,
        },
      );
    },
  );
}
