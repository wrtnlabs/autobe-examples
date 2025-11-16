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
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOnContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOnContent";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that content-targeted moderation action details are admin-only.
 *
 * Business purpose: This test ensures that the endpoint for retrieving
 * sensitive content information associated with a moderation action is only
 * accessible to authenticated adminUser actors. Unauthenticated callers
 * (guests) and callers using connections without admin authorization must not
 * be able to see these details, as they may expose moderated content,
 * rationale, and internal enforcement context.
 *
 * Scenario (adapted to available APIs):
 *
 * 1. Register an adminUser via /auth/adminUser/join, obtaining an authorized
 *    connection (the SDK automatically injects the Authorization header).
 * 2. With this adminUser, create a moderation case via POST
 *    /communityPlatform/adminUser/moderationCases using
 *    ICommunityPlatformModerationCase.ICreate.
 * 3. Optionally create an account restriction episode via POST
 *    /communityPlatform/adminUser/accountRestrictions using
 *    ICommunityPlatformAccountRestriction.ICreate and keep its id.
 * 4. Create a generic moderation action header via POST
 *    /communityPlatform/adminUser/moderationActions using
 *    ICommunityPlatformModerationAction.ICreate, linking it to the case and
 *    optionally to the account restriction. Capture its id as
 *    moderationActionId.
 * 5. Using a guest-style connection that has no Authorization header (simulate a
 *    separate unauthenticated client), call GET
 *    /communityPlatform/adminUser/moderationActions/{moderationActionId}/content
 *    and assert that the call fails (permission error) using
 *    TestValidator.error. We must not assert specific status codes, only that
 *    an error is thrown.
 * 6. Using another connection instance that also lacks admin Authorization
 *    (representing a non-admin actor in this limited test context), call the
 *    same endpoint and again assert that it fails using TestValidator.error.
 * 7. Finally, using the original admin-authenticated connection, call the endpoint
 *    and assert that it succeeds, returning a
 *    ICommunityPlatformModerationActionOnContent.IInvert object. Validate the
 *    response with typia.assert and then verify business-level expectations
 *    such as the moderation_action.id matching the moderationActionId used in
 *    the path.
 *
 * Notes and limitations:
 *
 * - The original scenario mentioned creating communities, posts, comments, and a
 *   memberUser. Corresponding APIs are not provided here, so this test focuses
 *   purely on the admin-only visibility aspect of the content details
 *   endpoint.
 * - We do not inspect HTTP status codes or error payloads; we only verify that
 *   unauthorized calls result in an error being thrown.
 * - We rely on the SDK's built-in behavior to manage Authorization headers for
 *   the main admin connection. To simulate guests/non-admins, we create fresh
 *   connection objects with empty headers and do not mutate the original
 *   connection.headers after join.
 */
export async function test_api_moderation_action_content_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain an authorized context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case under this admin.
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
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Optionally create an account restriction episode and link it later.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + oneDayMs).toISOString();

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert(restriction);

  // 4. Create a moderation action header linked to the case and restriction.
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "content",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  const moderationActionId = moderationAction.id;

  // Prepare a UUID-typed variable from the id for the content.at call.
  const moderationActionIdForPath: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(moderationActionId);

  // 5. Guest connection: simulate a completely unauthenticated caller.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guest cannot access moderation action content details",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.content.at(
        guestConnection,
        {
          moderationActionId: moderationActionIdForPath,
        },
      );
    },
  );

  // 6. Another non-admin-style connection (also no Authorization header).
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "non-admin connection cannot access moderation action content details",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.content.at(
        nonAdminConnection,
        {
          moderationActionId: moderationActionIdForPath,
        },
      );
    },
  );

  // 7. Admin-authenticated connection should succeed.
  const contentInvert: ICommunityPlatformModerationActionOnContent.IInvert =
    await api.functional.communityPlatform.adminUser.moderationActions.content.at(
      connection,
      {
        moderationActionId: moderationActionIdForPath,
      },
    );
  typia.assert(contentInvert);

  // Basic business-level validations on the successful response.
  TestValidator.equals(
    "returned moderation_action.id should match the requested moderationActionId",
    contentInvert.moderation_action.id,
    moderationActionId,
  );

  TestValidator.predicate(
    "moderation_action.scope should be 'content'",
    contentInvert.moderation_action.scope === "content",
  );

  TestValidator.equals(
    "moderation_action.moderation_case.summary.id should match created moderation case id when present",
    contentInvert.moderation_action.moderation_case?.id ?? moderationCase.id,
    moderationCase.id,
  );
}
