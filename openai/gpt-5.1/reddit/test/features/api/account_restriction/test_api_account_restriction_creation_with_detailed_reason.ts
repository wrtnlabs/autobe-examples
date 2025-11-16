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

/**
 * Validate that creating an account restriction with detailed moderator notes
 * correctly persists the optional `reason_detail` field without affecting other
 * required attributes.
 *
 * Business context: Administrative users (adminUser) can register account
 * restriction episodes in the community platform to enforce suspensions,
 * posting bans, or broader access limitations. Each restriction episode is
 * stored in `community_platform_account_restrictions` and includes core
 * attributes such as the target account_type, the enforcement scope, a
 * high-level reason_category, an optional free-text reason_detail, and the
 * temporal window (starts_at, ends_at).
 *
 * This test ensures that when an adminUser creates a restriction episode with a
 * non-empty `reason_detail` containing narrative moderator notes, the backend:
 *
 * 1. Accepts the payload alongside all required fields.
 * 2. Persists `reason_detail` exactly as provided (no truncation or mutation).
 * 3. Leaves other fields (account_type, scope, reason_category, starts_at,
 *    ends_at) unaffected by the presence of `reason_detail`.
 * 4. Correctly associates the created restriction with the authenticated admin via
 *    `createdByAdminUser`.
 *
 * Step-by-step process:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join using a random but valid
 *    join payload.
 * 2. Use the authenticated context to call POST
 *    /communityPlatform/adminUser/accountRestrictions with a composed
 *    ICommunityPlatformAccountRestriction.ICreate payload that:
 *
 *    - Sets deterministic values for account_type, scope, reason_category.
 *    - Provides a concrete starts_at and ends_at window.
 *    - Supplies a long, non-empty reason_detail string representing moderator notes.
 * 3. Validate that the response is a well-formed
 *    ICommunityPlatformAccountRestriction via typia.assert.
 * 4. Assert that response.reason_detail matches the submitted text exactly.
 * 5. Assert that account_type, scope, reason_category, starts_at, and ends_at in
 *    the response equal the values sent in the request.
 * 6. Assert that createdByAdminUser is present and its id equals the authorized
 *    adminUser id from the join step.
 */
export async function test_api_account_restriction_creation_with_detailed_reason(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and establish authenticated context.
  const joinRequestBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorizedAdmin);

  // 2. Prepare a detailed reason string for the restriction.
  const reasonDetail: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 16,
    wordMin: 4,
    wordMax: 12,
  });

  // 3. Build a deterministic restriction creation payload.
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const baseRestriction =
    typia.random<ICommunityPlatformAccountRestriction.ICreate>();

  const createBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: reasonDetail,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  // 4. Create the account restriction episode.
  const created: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(created);

  // 5. Field-level business assertions.
  TestValidator.equals(
    "reason_detail should be preserved verbatim",
    created.reason_detail,
    createBody.reason_detail,
  );

  TestValidator.equals(
    "account_type should match input",
    created.account_type,
    createBody.account_type,
  );

  TestValidator.equals(
    "scope should match input",
    created.scope,
    createBody.scope,
  );

  TestValidator.equals(
    "reason_category should match input",
    created.reason_category,
    createBody.reason_category,
  );

  TestValidator.equals(
    "starts_at should match input",
    created.starts_at,
    createBody.starts_at,
  );

  TestValidator.equals(
    "ends_at should match input",
    created.ends_at ?? null,
    createBody.ends_at ?? null,
  );

  // 6. Validate that createdByAdminUser linkage is present and matches
  //    the authorized admin id.
  TestValidator.predicate(
    "createdByAdminUser should be present",
    created.createdByAdminUser !== null &&
      created.createdByAdminUser !== undefined,
  );

  if (
    created.createdByAdminUser !== null &&
    created.createdByAdminUser !== undefined
  ) {
    TestValidator.equals(
      "createdByAdminUser.id should match authorized admin id",
      created.createdByAdminUser.id,
      authorizedAdmin.id,
    );
  }
}
