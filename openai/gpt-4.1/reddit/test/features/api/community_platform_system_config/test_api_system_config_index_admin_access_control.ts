import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemConfig";

/**
 * Validate access control for system config listing (admin only).
 *
 * 1. Register a system administrator (using unique email/password and superuser
 *    default).
 * 2. As the admin, call /communityPlatform/admin/systemConfigs with typical
 *    paging/filtering (at least page and limit, plus random key/description).
 *
 *    - Validate the response includes a paginated result (data array and pagination
 *         info).
 *    - Confirm typia.assert type checking for the result set.
 * 3. Switch to an unauthenticated connection (no Authorization header).
 * 4. Attempt to call the endpoint as an unauthenticated/non-admin user and expect
 *    an error (using TestValidator.error and an async callback with await).
 *
 * Business rule: Only authenticated admins may view the system configuration
 * index. Regular users and unauthenticated sessions must always be denied
 * access by default.
 */
export async function test_api_system_config_index_admin_access_control(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Call configs index endpoint as admin
  const filterRequest = {
    key: RandomGenerator.alphabets(5),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformSystemConfig.IRequest;
  const result =
    await api.functional.communityPlatform.admin.systemConfigs.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(result);
  TestValidator.predicate(
    "system config index returns data array",
    result.data instanceof Array && result.pagination !== undefined,
  );

  // 3. Switch to unauthenticated connection (no admin token)
  const noAuthConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Try to call endpoint as non-admin (should error)
  await TestValidator.error(
    "non-admin cannot access system config index",
    async () => {
      await api.functional.communityPlatform.admin.systemConfigs.index(
        noAuthConnection,
        { body: filterRequest },
      );
    },
  );
}
