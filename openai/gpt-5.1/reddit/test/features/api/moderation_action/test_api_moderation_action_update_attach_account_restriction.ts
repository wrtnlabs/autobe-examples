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
 * Attach an existing account restriction episode to a previously created
 * moderation action.
 *
 * Business flow:
 *
 * 1. Join as an adminUser to obtain an authenticated admin context.
 * 2. Create a moderation case that will own the moderation action.
 * 3. Create a moderation action header without any account_restriction linkage.
 * 4. Create an account restriction episode describing technical enforcement.
 * 5. Call the moderationActions.update endpoint with an IUpdate body that sets
 *    account_restriction_id to the created restriction's id.
 * 6. Verify that the updated moderation action reflects the linkage while core
 *    fields (action_type, scope, moderation_case, actor_admin) remain stable
 *    and that updated_at has advanced while created_at is unchanged.
 */
export async function test_api_moderation_action_update_attach_account_restriction(
  connection: api.IConnection,
) {
  // 1. Authenticate as adminUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case that will own the moderation action
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Create moderation action without account_restriction_id
  const moderationActionCreateBody = {
    moderation_case_id: moderationCase.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    account_restriction_id: null,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // basic sanity checks on create result
  TestValidator.equals(
    "created moderation action uses given moderation_case_id",
    moderationAction.moderation_case?.id,
    moderationCase.id,
  );
  TestValidator.equals(
    "created moderation action has no account restriction linked yet",
    moderationAction.account_restriction,
    null,
  );

  const createdAtBeforeUpdate = moderationAction.created_at;
  const updatedAtBeforeUpdate = moderationAction.updated_at;

  // 4. Create an account restriction episode
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAtDate = new Date(now.getTime() + 60 * 60 * 1000);
  const endsAt = endsAtDate.toISOString() as string & tags.Format<"date-time">;

  const restrictionCreateBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionCreateBody },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 5. Update moderation action with account_restriction_id set
  const updateBody = {
    account_restriction_id: restriction.id,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updated: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(updated);

  // 6. Validate response and linkage
  TestValidator.equals(
    "updated action id should remain the same",
    updated.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "action_type should remain unchanged after update",
    updated.action_type,
    moderationAction.action_type,
  );
  TestValidator.equals(
    "scope should remain unchanged after update",
    updated.scope,
    moderationAction.scope,
  );
  TestValidator.equals(
    "reason_category remains same when not provided in update body",
    updated.reason_category,
    moderationAction.reason_category,
  );
  TestValidator.equals(
    "reason_detail remains same when not provided in update body",
    updated.reason_detail,
    moderationAction.reason_detail,
  );

  TestValidator.equals(
    "moderation_case association remains the same",
    updated.moderation_case?.id,
    moderationAction.moderation_case?.id,
  );
  TestValidator.equals(
    "actor_admin association remains the same",
    updated.actor_admin?.id,
    moderationAction.actor_admin?.id,
  );

  TestValidator.equals(
    "created_at should not change after update",
    updated.created_at,
    createdAtBeforeUpdate,
  );
  TestValidator.predicate(
    "updated_at should be refreshed and differ from previous updated_at",
    updated.updated_at !== updatedAtBeforeUpdate,
  );

  TestValidator.equals(
    "account_restriction summary should now be populated",
    updated.account_restriction?.id,
    restriction.id,
  );
  TestValidator.equals(
    "account_restriction account_type matches restriction",
    updated.account_restriction?.account_type,
    restriction.account_type as "memberUser" | "adminUser",
  );
}
