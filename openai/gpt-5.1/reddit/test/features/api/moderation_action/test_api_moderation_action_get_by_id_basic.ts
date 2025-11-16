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

export async function test_api_moderation_action_get_by_id_basic(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates adminUser and establishes authenticated context)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case required for the action
  const moderationCaseBody = {
    case_key: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert(createdCase);

  // 3. Create an account restriction episode that the moderation action will reference
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const restrictionBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(createdRestriction);

  // 4. Create a moderation action header referencing the case and restriction
  const actionBody = {
    moderation_case_id: createdCase.id,
    account_restriction_id: createdRestriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: actionBody },
    );
  typia.assert(createdAction);

  // For a fresh action, reverted_at and deleted_at should be null or undefined
  TestValidator.equals(
    "fresh action reverted_at should be null or undefined",
    createdAction.reverted_at ?? null,
    null,
  );
  TestValidator.equals(
    "fresh action deleted_at should be null or undefined",
    createdAction.deleted_at ?? null,
    null,
  );

  // 5. Fetch the moderation action by its ID using the GET endpoint
  const fetchedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.at(
      connection,
      {
        moderationActionId: createdAction.id,
      },
    );
  typia.assert(fetchedAction);

  // 6. Validate that core fields match between created and fetched actions
  TestValidator.equals(
    "moderation action id should match",
    fetchedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "action_type should match",
    fetchedAction.action_type,
    createdAction.action_type,
  );
  TestValidator.equals(
    "scope should match",
    fetchedAction.scope,
    createdAction.scope,
  );
  TestValidator.equals(
    "reason_category should match",
    fetchedAction.reason_category,
    createdAction.reason_category,
  );
  TestValidator.equals(
    "reason_detail should match",
    fetchedAction.reason_detail ?? null,
    createdAction.reason_detail ?? null,
  );

  // 7. Validate audit-related fields (reverted_at, deleted_at) remain null for fetched action
  TestValidator.equals(
    "fetched action reverted_at should remain null or undefined",
    fetchedAction.reverted_at ?? null,
    null,
  );
  TestValidator.equals(
    "fetched action deleted_at should remain null or undefined",
    fetchedAction.deleted_at ?? null,
    null,
  );

  // 8. Validate embedded summaries where expected
  // moderation_case summary must be present and reference the same case id
  TestValidator.predicate(
    "fetched action moderation_case summary should exist",
    fetchedAction.moderation_case !== undefined &&
      fetchedAction.moderation_case !== null,
  );
  if (
    fetchedAction.moderation_case !== undefined &&
    fetchedAction.moderation_case !== null
  ) {
    TestValidator.equals(
      "moderation_case summary id should match created case",
      fetchedAction.moderation_case.id,
      createdCase.id,
    );
  }

  // actor_admin summary should exist and reference the same admin id
  TestValidator.predicate(
    "fetched action actor_admin summary should exist",
    fetchedAction.actor_admin !== undefined &&
      fetchedAction.actor_admin !== null,
  );
  if (
    fetchedAction.actor_admin !== undefined &&
    fetchedAction.actor_admin !== null
  ) {
    TestValidator.equals(
      "actor_admin summary id should match admin user id",
      fetchedAction.actor_admin.id,
      adminAuthorized.id,
    );
  }

  // account_restriction summary should exist and reference the created restriction id
  TestValidator.predicate(
    "fetched action account_restriction summary should exist",
    fetchedAction.account_restriction !== undefined &&
      fetchedAction.account_restriction !== null,
  );
  if (
    fetchedAction.account_restriction !== undefined &&
    fetchedAction.account_restriction !== null
  ) {
    TestValidator.equals(
      "account_restriction summary id should match created restriction",
      fetchedAction.account_restriction.id,
      createdRestriction.id,
    );
  }
}
