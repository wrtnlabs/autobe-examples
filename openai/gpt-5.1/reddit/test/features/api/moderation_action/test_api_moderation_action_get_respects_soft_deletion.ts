import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Validate that fetching a moderation action by ID returns only active actions
 * and behaves consistently when the record does not exist.
 *
 * Business flow implemented:
 *
 * 1. Admin joins the platform to obtain an authenticated adminUser context.
 * 2. Admin creates a moderation case that will own the moderation action.
 * 3. Admin creates an account restriction episode to optionally link to the
 *    action.
 * 4. Admin creates a moderation action header associated with the case (and
 *    restriction).
 * 5. Admin reads the moderation action via GET
 *    /communityPlatform/adminUser/moderationActions/{moderationActionId}.
 * 6. Assert that the fetched action matches the created action (id, case linkage,
 *    core fields) and that deleted_at is null.
 * 7. Call GET with a random, non-existent moderationActionId and assert that it
 *    fails, verifying not-found style behavior for unknown or logically
 *    excluded actions.
 */
export async function test_api_moderation_action_get_respects_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform (auth/adminUser/join) to obtain an adminUser context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case that will own the moderation action
  const caseBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: caseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Create an account restriction episode to optionally link to the action
  const now = new Date();
  const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: now.toISOString() as string & tags.Format<"date-time">,
    ends_at: ends.toISOString() as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert(restriction);

  // 4. Create a moderation action header associated with the case and restriction
  const actionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: actionBody,
      },
    );
  typia.assert(createdAction);

  // 5. Fetch the moderation action by ID via GET /moderationActions/{moderationActionId}
  const fetchedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.at(
      connection,
      {
        moderationActionId: createdAction.id,
      },
    );
  typia.assert(fetchedAction);

  // 6. Validate that the fetched action matches the created one and is not soft-deleted
  TestValidator.equals(
    "fetched moderation action id matches created id",
    fetchedAction.id,
    createdAction.id,
  );

  TestValidator.equals(
    "fetched moderation action action_type matches",
    fetchedAction.action_type,
    createdAction.action_type,
  );

  TestValidator.equals(
    "fetched moderation action scope matches",
    fetchedAction.scope,
    createdAction.scope,
  );

  TestValidator.equals(
    "fetched moderation action reason_category matches",
    fetchedAction.reason_category,
    createdAction.reason_category,
  );

  TestValidator.equals(
    "fetched moderation action reason_detail matches",
    fetchedAction.reason_detail ?? null,
    createdAction.reason_detail ?? null,
  );

  TestValidator.equals(
    "fetched moderation action account_restriction summary id matches",
    fetchedAction.account_restriction?.id ?? null,
    createdAction.account_restriction?.id ?? null,
  );

  TestValidator.equals(
    "fetched moderation action deleted_at should be null for active record",
    fetchedAction.deleted_at ?? null,
    null,
  );

  // 7. Ensure not-found style behavior for an unknown moderationActionId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "requesting a non-existent moderation action should result in an error",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.at(
        connection,
        {
          moderationActionId: nonExistentId,
        },
      );
    },
  );
}
