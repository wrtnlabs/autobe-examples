import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_member_registration_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // 1) Seed an existing admin account to occupy username/email
  const seededUsername = `admin_${RandomGenerator.alphaNumeric(6)}`;
  const seededEmail = typia.random<string & tags.Format<"email">>();
  const seededPassword = "P@ssw0rd123!";

  const adminBody = {
    username: seededUsername,
    email: seededEmail,
    password: seededPassword,
    displayName: RandomGenerator.name(),
  } satisfies ICommunityPortalAdmin.ICreate;

  const adminAuth: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(adminAuth);

  // Confirm returned user summary contains the seeded username
  TestValidator.equals(
    "admin username matches seed",
    adminAuth.user.username,
    seededUsername,
  );

  // 2) Attempt member registration using the exact same username+email
  const memberDuplicateBoth = {
    username: seededUsername,
    email: seededEmail,
    password: "MemberPass!234",
  } satisfies ICommunityPortalMember.ICreate;

  await TestValidator.error(
    "member join with duplicate username and email should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: memberDuplicateBoth,
      });
    },
  );

  // 3) Attempt member registration using same email but different username
  const memberDuplicateEmail = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: seededEmail,
    password: "MemberPass!234",
  } satisfies ICommunityPortalMember.ICreate;

  await TestValidator.error(
    "member join with duplicate email should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: memberDuplicateEmail,
      });
    },
  );

  // 4) Attempt member registration using same username but different email
  const memberDuplicateUsername = {
    username: seededUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass!234",
  } satisfies ICommunityPortalMember.ICreate;

  await TestValidator.error(
    "member join with duplicate username should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: memberDuplicateUsername,
      });
    },
  );

  // NOTE: No cleanup API is available in the provided SDK. Tests must run in
  // an isolated environment or the harness must reset DB state between tests.
}
