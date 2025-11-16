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
 * Validate adminUser-driven account restriction creation with temporal
 * validation.
 *
 * Business context: Administrative users of the community platform can create
 * account restriction episodes that limit capabilities (login, posting, etc.)
 * for different actor types, including member users. These restriction episodes
 * have a temporal window defined by `starts_at` (required) and `ends_at`
 * (optional). Business rules and persistence constraints must ensure that only
 * logically valid temporal windows are accepted.
 *
 * This test executes a full workflow to validate that:
 *
 * - An adminUser can be registered and authenticated via /auth/adminUser/join.
 * - Attempting to create a generic restriction with an invalid temporal window
 *   (ends_at before starts_at) fails with an error.
 * - Creating a generic restriction with a valid temporal window succeeds.
 * - Creating a member-user–specific restriction via
 *   /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions
 *   also succeeds when using a valid temporal window.
 * - Successful responses preserve the provided temporal values and include
 *   consistent metadata such as account_type and scope.
 *
 * Step-by-step process:
 *
 * 1. Join an adminUser using random but valid credentials to obtain an
 *    authenticated admin context.
 * 2. Construct an invalid restriction payload where starts_at is a future instant
 *    and ends_at is a timestamp in the past, then call POST
 *    /communityPlatform/adminUser/accountRestrictions and assert that the
 *    operation fails.
 * 3. Construct a corrected restriction payload with the same semantics but
 *    adjusted so ends_at is after starts_at, then call the same endpoint and
 *    assert that it succeeds, returning an
 *    ICommunityPlatformAccountRestriction.
 * 4. Using the same admin session, construct a member-user–scoped restriction
 *    payload with a valid temporal window and call POST
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions
 *    for a known username (here we simply reuse the admin username as a sample
 *    identifier, assuming the backend either accepts it as a member username in
 *    simulation or there exists such a member in non-simulated environments).
 * 5. Assert that both successful responses contain starts_at and ends_at values
 *    that match the request and that ends_at is either null or strictly greater
 *    than starts_at in lexicographical comparison of ISO strings.
 */
export async function test_api_admin_member_user_account_restriction_creation_with_temporal_validation(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm!nPassw0rd" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Attempt to create a restriction with an invalid temporal window.
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const past = new Date(now.getTime() - 60 * 60 * 1000); // -1 hour

  const invalidRestrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: future.toISOString(),
    ends_at: past.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  await TestValidator.error(
    "creating restriction with ends_at before starts_at must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.accountRestrictions.create(
        connection,
        {
          body: invalidRestrictionBody,
        },
      );
    },
  );

  // 3. Create a restriction with a valid temporal window that should succeed.
  const validStartsAt = now.toISOString();
  const validEndsAt = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();

  const validRestrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: validStartsAt,
    ends_at: validEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: validRestrictionBody,
      },
    );
  typia.assert(genericRestriction);

  // Ensure temporal fields are preserved and logically ordered.
  TestValidator.equals(
    "generic restriction starts_at must match request",
    genericRestriction.starts_at,
    validRestrictionBody.starts_at,
  );
  TestValidator.equals(
    "generic restriction ends_at must match request",
    genericRestriction.ends_at,
    validRestrictionBody.ends_at,
  );
  TestValidator.predicate(
    "generic restriction ends_at is after starts_at",
    () =>
      genericRestriction.ends_at !== undefined &&
      genericRestriction.ends_at !== null &&
      genericRestriction.starts_at < genericRestriction.ends_at,
  );

  // 4. Create a member-user–scoped restriction using the username path param.
  const memberStartsAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const memberEndsAt = new Date(now.getTime() + 65 * 60 * 1000).toISOString();

  const memberRestrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: memberStartsAt,
    ends_at: memberEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: adminAuthorized.username,
        body: memberRestrictionBody,
      },
    );
  typia.assert(memberRestriction);

  // 5. Validate member-scoped restriction temporal fields and basic metadata.
  TestValidator.equals(
    "member restriction starts_at must match request",
    memberRestriction.starts_at,
    memberRestrictionBody.starts_at,
  );
  TestValidator.equals(
    "member restriction ends_at must match request",
    memberRestriction.ends_at,
    memberRestrictionBody.ends_at,
  );
  TestValidator.predicate(
    "member restriction ends_at is after starts_at",
    () =>
      memberRestriction.ends_at !== undefined &&
      memberRestriction.ends_at !== null &&
      memberRestriction.starts_at < memberRestriction.ends_at,
  );
  TestValidator.equals(
    "member restriction account_type must be memberUser",
    memberRestriction.account_type,
    memberRestrictionBody.account_type,
  );
}
