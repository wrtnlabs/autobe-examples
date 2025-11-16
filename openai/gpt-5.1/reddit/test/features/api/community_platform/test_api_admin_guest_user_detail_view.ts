import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

export async function test_api_admin_guest_user_detail_view(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (join) and establish adminUser auth context
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Token sanity: shape is guaranteed by typia.assert; just ensure access is usable
  const token: IAuthorizationToken = adminAuthorized.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "admin access token string must be non-empty",
    () => token.access.length > 0,
  );

  // 2. Create a baseline system configuration as adminUser
  const systemConfigCreate =
    typia.random<ICommunityPlatformSystemConfig.ICreate>();

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigCreate,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(createdConfig);

  TestValidator.predicate(
    "created system config active flag must mirror request is_active",
    () => createdConfig.is_active === systemConfigCreate.is_active,
  );

  // 3. Prepare a guest user id to query.
  //
  // In simulation mode, any UUID-shaped string is acceptable; NestiaSimulator
  // will generate a random ICommunityPlatformGuestuser regardless of id.
  // Against a real backend, test environments should seed a guest user record
  // with some valid UUID. Here we rely on UUID format correctness and type
  // assertions rather than specific fixture coupling.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call the guest user detail endpoint as authenticated adminUser
  const guestUser: ICommunityPlatformGuestuser =
    await api.functional.communityPlatform.adminUser.guestUsers.at(connection, {
      guestUserId,
    });
  typia.assert<ICommunityPlatformGuestuser>(guestUser);

  // 5. Business-level sanity check around soft-deletion semantics.
  // deleted_at may be null/undefined (active or never deleted) or a timestamp
  // string when logically deleted; typia.assert already guarantees type, so we
  // only enforce a simple logical predicate.
  TestValidator.predicate(
    "guest user deleted_at, when present, must be a non-empty string",
    () =>
      guestUser.deleted_at === null ||
      guestUser.deleted_at === undefined ||
      guestUser.deleted_at.length > 0,
  );
}
