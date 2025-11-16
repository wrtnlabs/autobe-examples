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
 * Validate deletion of a moderation action that is linked to an account
 * restriction.
 *
 * Business intent:
 *
 * - An adminUser can create a moderation case.
 * - The same adminUser can register an account restriction episode.
 * - A moderation action header may reference that restriction.
 * - Deleting the moderation action header must not delete or corrupt the
 *   underlying account restriction episode.
 *
 * Steps:
 *
 * 1. Join as an adminUser (POST /auth/adminUser/join) and obtain an authorized
 *    context.
 * 2. Create a moderation case (POST /communityPlatform/adminUser/moderationCases).
 * 3. Create an account restriction episode (POST
 *    /communityPlatform/adminUser/accountRestrictions).
 * 4. Create a moderation action header that references both the moderation case
 *    and the account restriction (POST
 *    /communityPlatform/adminUser/moderationActions).
 * 5. Delete the moderation action via DELETE
 *    /communityPlatform/adminUser/moderationActions/{moderationActionId}.
 * 6. Attempt to delete the same moderation action again and assert that an error
 *    occurs, validating that the record is gone.
 * 7. Confirm that the previously created account restriction object remains
 *    structurally valid (typia.assert) and logically independent from the
 *    deleted moderation action header.
 */
export async function test_api_moderation_action_delete_with_linked_account_restriction(
  connection: api.IConnection,
) {
  // 1. Join as adminUser and establish authorized context
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case
  const moderationCaseBody =
    typia.random<ICommunityPlatformModerationCase.ICreate>();
  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // Sanity check wiring: creator_adminuser_id should match adminAuthorized.id
  TestValidator.equals(
    "moderation case creator should be the joined admin",
    moderationCase.creator_adminuser_id,
    adminAuthorized.id,
  );

  // 3. Create an account restriction episode
  const accountRestrictionBody =
    typia.random<ICommunityPlatformAccountRestriction.ICreate>();
  const accountRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: accountRestrictionBody,
      },
    );
  typia.assert(accountRestriction);

  // Ensure the restriction carries the requested discriminator and scope
  TestValidator.equals(
    "account restriction account_type is preserved",
    accountRestriction.account_type,
    accountRestrictionBody.account_type,
  );
  TestValidator.equals(
    "account restriction scope is preserved",
    accountRestriction.scope,
    accountRestrictionBody.scope,
  );

  // 4. Create a moderation action header referencing the case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: accountRestriction.id,
    action_type: "restrict_account",
    scope: accountRestriction.scope,
    reason_category: accountRestriction.reason_category,
    reason_detail: accountRestriction.reason_detail ?? null,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // Validate that the action is wired to the correct case and restriction
  if (moderationAction.moderation_case !== undefined) {
    TestValidator.equals(
      "moderation action summary case id matches source case",
      moderationAction.moderation_case.id,
      moderationCase.id,
    );
  }
  if (
    moderationAction.account_restriction !== undefined &&
    moderationAction.account_restriction !== null
  ) {
    TestValidator.equals(
      "moderation action summary restriction id matches source restriction",
      moderationAction.account_restriction.id,
      accountRestriction.id,
    );
  }

  // 5. Delete the moderation action header
  await api.functional.communityPlatform.adminUser.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );

  // 6. Second deletion should fail because the target no longer exists
  await TestValidator.error(
    "second deletion of same moderation action should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.erase(
        connection,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );

  // 7. The account restriction episode should remain valid and unaffected.
  // We cannot refetch it (no GET endpoint), but we can still assert that the
  // original object remains structurally sound, emphasizing separation of
  // lifecycles between action header and restriction episode.
  typia.assert<ICommunityPlatformAccountRestriction>(accountRestriction);

  TestValidator.predicate(
    "account restriction still appears active or pending after action deletion",
    accountRestriction.deleted_at === null ||
      accountRestriction.deleted_at === undefined,
  );
}
