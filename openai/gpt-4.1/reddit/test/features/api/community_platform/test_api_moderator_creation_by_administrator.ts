import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate moderator creation by platform administrator.
 *
 * This test verifies that only an authenticated administrator can create a new
 * moderator for a given community, following proper business and workflow
 * logic. It checks validation, forbidden sensitive data in responses,
 * enforcement of email uniqueness, and error handling.
 *
 * Steps:
 *
 * 1. Register a new administrator using unique email/password via POST
 *    /auth/administrator/join.
 * 2. Authenticate as the administrator (token is handled automatically via SDK).
 * 3. Create a new moderator via POST
 *    /communityPlatform/administrator/communities/{communityName}/moderators
 *    using a valid set of moderator fields: unique email, strong password,
 *    valid status, session context.
 * 4. Validate the created moderator record: correct email, status,
 *    business_status, audit timestamps. Ensure password is never returned in
 *    the response.
 * 5. Attempt to create another moderator with the same email (should fail due to
 *    uniqueness constraint).
 * 6. Attempt creation without authentication (should fail due to lack of admin
 *    privilege).
 */
export async function test_api_moderator_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    business_status: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "joined administrator email matches",
    adminAuth.email,
    adminEmail,
  );

  // 2. Prepare valid moderator creation payload
  const communityName = RandomGenerator.alphaNumeric(10);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(20);
  const moderatorStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
    "banned",
  ] as const);
  const businessStatus = RandomGenerator.paragraph({ sentences: 2 });
  const href = `https://community.example.com/${communityName}`;
  const referrer = "https://platform.example.com/onboarding";
  const ipv4 = typia.random<string & tags.Format<"ipv4">>();
  const moderatorBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    status: moderatorStatus,
    business_status: businessStatus,
    href,
    referrer,
    ip: ipv4,
  } satisfies ICommunityPlatformModerator.ICreate;

  // 3. Create moderator as admin (authorized)
  const moderator =
    await api.functional.communityPlatform.administrator.communities.moderators.create(
      connection,
      {
        communityName,
        body: moderatorBody,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator status matches",
    moderator.status,
    moderatorStatus,
  );
  TestValidator.equals(
    "moderator business_status matches",
    moderator.business_status,
    businessStatus,
  );
  TestValidator.predicate(
    "moderator has valid creation timestamp",
    typeof moderator.created_at === "string" && moderator.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderator has valid update timestamp",
    typeof moderator.updated_at === "string" && moderator.updated_at.length > 0,
  );
  TestValidator.equals(
    "moderator deleted_at is null or undefined",
    moderator.deleted_at,
    null,
  );
  // Never return password in moderator response
  TestValidator.predicate(
    "moderator response should not contain password property",
    !("password" in moderator),
  );

  // 4. Enforce uniqueness by attempting to create moderator with duplicate email (should error)
  await TestValidator.error(
    "duplicate moderator email creation should fail",
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.create(
        connection,
        {
          communityName,
          body: {
            ...moderatorBody,
            password: RandomGenerator.alphaNumeric(20), // Even with different password
          } satisfies ICommunityPlatformModerator.ICreate,
        },
      );
    },
  );

  // 5. Attempt moderator creation without admin authentication (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated connection should not allow moderator creation",
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.create(
        unauthConn,
        {
          communityName: RandomGenerator.alphaNumeric(10),
          body: {
            ...moderatorBody,
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(18),
          } satisfies ICommunityPlatformModerator.ICreate,
        },
      );
    },
  );
}
