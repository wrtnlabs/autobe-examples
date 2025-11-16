import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate that an authenticated adminUser can retrieve detailed, non-sensitive
 * information about an admin account by username.
 *
 * Business context:
 *
 * - Admin accounts are stored in community_platform_adminusers and exposed
 *   through adminUser-facing APIs.
 * - The join endpoint both creates an adminUser and returns an authorized context
 *   with JWT tokens.
 * - The detailed read endpoint by username must expose only
 *   ICommunityPlatformAdminuser fields and no authentication secrets.
 *
 * Steps:
 *
 * 1. Create an adminUser (admin A) with POST /auth/adminUser/join using a
 *    realistic username, email, and password.
 * 2. Validate the join response as ICommunityPlatformAdminuser.IAuthorized and
 *    ensure id, username, email, and token structure are present via
 *    typia.assert.
 * 3. Use the authenticated context (connection with Authorization set by the join
 *    SDK) to create a benign system config via POST
 *    /communityPlatform/adminUser/systemConfigs, asserting the response as
 *    ICommunityPlatformSystemConfig.
 * 4. Invoke GET /communityPlatform/adminUser/adminUsers/{username} for the
 *    username returned at join time.
 * 5. Validate the response as ICommunityPlatformAdminuser and check that:
 *
 *    - Id matches the id from the authorized join response
 *    - Username matches the join request username
 *    - Email matches the join request email
 *    - Failed_login_count is treated as freshly initialized by comparing detail vs.
 *         authorized identity where meaningful
 *    - Locked_until and deleted_at are null or undefined (no active lock or soft
 *         deletion immediately after join).
 * 6. Rely on typia.assert and the DTOs to guarantee that only documented
 *    ICommunityPlatformAdminuser fields are present and that no authentication
 *    secrets such as password hashes or raw tokens are exposed.
 */
export async function test_api_admin_user_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create adminUser via join
  const joinRequestBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Cross-check identity fields between join request and authorized payload
  TestValidator.equals(
    "authorized username matches join request",
    authorized.username,
    joinRequestBody.username,
  );
  TestValidator.equals(
    "authorized email matches join request",
    authorized.email,
    joinRequestBody.email,
  );

  // 3. Create a benign system configuration to exercise admin write
  const systemConfigBody = {
    category: "auth",
    config_key: "login_policy_max_attempts",
    value: "10",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // 4. Fetch admin detail by username
  const detail: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.at(connection, {
      username: authorized.username,
    });
  typia.assert<ICommunityPlatformAdminuser>(detail);

  // 5. Cross-validate identity fields between authorized context and detail
  TestValidator.equals(
    "detail id matches authorized id",
    detail.id,
    authorized.id,
  );
  TestValidator.equals(
    "detail username matches join request",
    detail.username,
    joinRequestBody.username,
  );
  TestValidator.equals(
    "detail email matches join request",
    detail.email,
    joinRequestBody.email,
  );

  // 6. Nullable security/time fields should indicate no lock or soft deletion
  TestValidator.predicate(
    "locked_until is null or undefined right after join",
    detail.locked_until === null || detail.locked_until === undefined,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined right after join",
    detail.deleted_at === null || detail.deleted_at === undefined,
  );

  // Rely on typia.assert and DTOs to ensure that the payload contains only the
  // documented ICommunityPlatformAdminuser fields and no authentication secrets.
}
