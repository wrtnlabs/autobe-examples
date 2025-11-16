import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

export async function test_api_admin_user_deletion_with_related_platform_state(
  connection: api.IConnection,
) {
  // 1. Register Admin A who will own system configs and perform deletion
  const adminAJoinBody = {
    username: `admin-a-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // 2. Using Admin A, create a system configuration entry representing existing platform state
  const initialSystemConfigBody = {
    category: "auth", // simple logical category
    config_key: `max_login_attempts_${RandomGenerator.alphaNumeric(6)}`,
    value: "5", // string payload, semantics left to backend
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const initialSystemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: initialSystemConfigBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(initialSystemConfig);

  // 3. Register Admin B (target of deletion). join also switches Authorization to Admin B
  const adminBJoinBody = {
    username: `admin-b-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminB);

  // 4. Re-authenticate as Admin A so that deletion is performed by Admin A, not Admin B
  const adminARejoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminARejoin);

  // 5. Delete Admin B by username using the adminUsers.erase endpoint
  await api.functional.communityPlatform.adminUser.adminUsers.erase(
    connection,
    {
      username: adminB.username,
    },
  );

  // If we reach here without error, deletion is considered successful.
  // Additionally assert that the username used for deletion matches Admin B's join request.
  TestValidator.equals(
    "deleted admin username should match Admin B username",
    adminB.username,
    adminBJoinBody.username,
  );

  // 6. After deletion of Admin B, ensure platform state remains consistent by
  // creating another system configuration successfully as Admin A.
  const postDeletionSystemConfigBody = {
    category: "ui", // different category to distinguish from first
    config_key: `feature_flag_${RandomGenerator.alphaNumeric(6)}`,
    value: "true", // boolean-like semantic stored as string
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const postDeletionSystemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: postDeletionSystemConfigBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(postDeletionSystemConfig);

  // 7. Validate that both system configs are active and independent objects
  TestValidator.predicate(
    "initial system config remains active after admin deletion",
    initialSystemConfig.is_active === true,
  );

  TestValidator.predicate(
    "new system config created after admin deletion is active",
    postDeletionSystemConfig.is_active === true,
  );
}
