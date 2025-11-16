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
 * Basic adminUser-driven retrieval of detailed memberUser account information.
 *
 * This test ensures that an authenticated administrative actor (adminUser) can
 * successfully call the member user detail endpoint and receive a fully typed
 * ICommunityPlatformMemberuser payload suitable for moderation and support
 * workflows.
 *
 * Business / workflow steps:
 *
 * 1. Register and authenticate an adminUser using the /auth/adminUser/join
 *    endpoint.
 *
 *    - This establishes an admin session and implicitly sets the Authorization
 *         header on the shared connection via the SDK.
 * 2. Create at least one generic account restriction episode through POST
 *    /communityPlatform/adminUser/accountRestrictions to ensure that the
 *    restriction model is initialized and usable from an admin context.
 * 3. From the same authenticated admin session, invoke GET
 *    /communityPlatform/adminUser/memberUsers/{username} for some username
 *    value and retrieve an ICommunityPlatformMemberuser instance.
 * 4. Validate that the returned member user DTO:
 *
 *    - Conforms to the ICommunityPlatformMemberuser shape using typia.assert.
 *    - Exposes the expected moderation and lifecycle fields (id, username, email,
 *         is_email_verified, is_suspended, is_banned, failed_login_count,
 *         locked_until, created_at, updated_at, deleted_at).
 *    - Does not expose sensitive authentication secrets such as password_hash.
 *
 * NOTE: Because there is no memberUser creation API in the provided SDK, this
 * test is written as a contract/shape validation for a successful admin-only
 * detail call instead of verifying a specific pre-created username. In a real
 * environment, seed data or a dedicated memberUser factory would be used.
 */
export async function test_api_admin_memberuser_detail_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline account restriction episode
  const now = new Date();
  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: now.toISOString(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  // 3. Retrieve a memberUser detail record as admin
  const targetUsername: string = RandomGenerator.name(1);

  const member: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.adminUser.memberUsers.at(
      connection,
      { username: targetUsername },
    );
  typia.assert(member);

  // 4. Semantic assertions on returned member user
  TestValidator.predicate(
    "member user id must be a non-empty string",
    typeof member.id === "string" && member.id.length > 0,
  );

  TestValidator.predicate(
    "member user username must be a non-empty string",
    typeof member.username === "string" && member.username.length > 0,
  );

  TestValidator.predicate(
    "member user email must be a non-empty string",
    typeof member.email === "string" && member.email.length > 0,
  );

  TestValidator.predicate(
    "member user email verification flag must be boolean",
    typeof member.is_email_verified === "boolean",
  );

  TestValidator.predicate(
    "member user suspension flag must be boolean",
    typeof member.is_suspended === "boolean",
  );

  TestValidator.predicate(
    "member user ban flag must be boolean",
    typeof member.is_banned === "boolean",
  );

  TestValidator.predicate(
    "member user failed_login_count must be a finite number",
    typeof member.failed_login_count === "number" &&
      Number.isFinite(member.failed_login_count),
  );

  TestValidator.predicate(
    "member user created_at must be a non-empty string",
    typeof member.created_at === "string" && member.created_at.length > 0,
  );

  TestValidator.predicate(
    "member user updated_at must be a non-empty string",
    typeof member.updated_at === "string" && member.updated_at.length > 0,
  );

  TestValidator.predicate(
    "member user locked_until, when present, must be null or non-empty string",
    member.locked_until === undefined ||
      member.locked_until === null ||
      (typeof member.locked_until === "string" &&
        member.locked_until.length > 0),
  );

  TestValidator.predicate(
    "member user deleted_at, when present, must be null or non-empty string",
    member.deleted_at === undefined ||
      member.deleted_at === null ||
      (typeof member.deleted_at === "string" && member.deleted_at.length > 0),
  );

  // Ensure no password_hash field is exposed on the DTO
  TestValidator.predicate(
    "member user DTO must not expose password_hash field",
    !("password_hash" in (member as Record<string, unknown>)),
  );
}
