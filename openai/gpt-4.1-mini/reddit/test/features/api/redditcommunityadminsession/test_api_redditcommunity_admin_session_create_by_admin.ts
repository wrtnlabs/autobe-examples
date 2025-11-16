import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_redditcommunity_admin_session_create_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate and create the first admin user account
  const adminJoinPayload = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "securePassword123",
  } satisfies IRedditCommunityAdmin.ICreate;

  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinPayload,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a platform-level Reddit Community Admin user
  const newAdminPayload = {
    email: `rc_admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "securePassword456",
  } satisfies IRedditCommunityRedditCommunityAdmin.ICreate;

  const createdAdmin: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      {
        body: newAdminPayload,
      },
    );
  typia.assert(createdAdmin);

  // 3. Authenticate and create a second admin user account (dependency requirement)
  const secondAdminJoinPayload = {
    email: `admin2_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "securePassword789",
  } satisfies IRedditCommunityAdmin.ICreate;

  const authorizedAdmin2: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminJoinPayload,
    });
  typia.assert(authorizedAdmin2);

  // 4. Authenticate and create a third admin user account (dependency requirement)
  const thirdAdminJoinPayload = {
    email: `admin3_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "securePassword000",
  } satisfies IRedditCommunityAdmin.ICreate;

  const authorizedAdmin3: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: thirdAdminJoinPayload,
    });
  typia.assert(authorizedAdmin3);

  // 5. Generate valid IPv4 address for session IP
  const ipv4Segment = () =>
    typia.assert<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
    >(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
      >(),
    );
  const ipAddress = `${ipv4Segment()}.${ipv4Segment()}.${ipv4Segment()}.${ipv4Segment()}`;

  // 6. Create an admin session linked to the created Reddit Community Admin
  const sessionCreatePayload = {
    ip: ipAddress,
    href: "https://redditcommunity.example.com/admin/dashboard",
    referrer: "https://redditcommunity.example.com/login",
    expiredAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day later
  } satisfies IRedditCommunityAdminSession.ICreate;

  const createdSession: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunity.admins.adminSessions.create(
      connection,
      {
        adminId: createdAdmin.id,
        body: sessionCreatePayload,
      },
    );
  typia.assert(createdSession);

  // 7. Validate linkage between session and admin
  TestValidator.equals(
    "adminId matches in session creation",
    createdSession.adminId,
    createdAdmin.id,
  );

  // 8. Validate key session properties are correctly set
  TestValidator.predicate(
    "session href should include 'admin/dashboard'",
    createdSession.href.includes("admin/dashboard"),
  );
  TestValidator.predicate(
    "session referrer should include 'login'",
    createdSession.referrer.includes("login"),
  );
  TestValidator.predicate(
    "session expiredAt should be in future",
    new Date(createdSession.expiredAt!).getTime() > Date.now(),
  );
}
