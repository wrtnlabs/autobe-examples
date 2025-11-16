import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a logged-in platform administrator can inspect another
 * administrator's credential metadata.
 *
 * Business flow:
 *
 * 1. Register two platform administrators (Admin B, then Admin A) using the join
 *    endpoint so that the connection ends authenticated as Admin A.
 * 2. With Admin A's session, call the credentials inspection endpoint targeting
 *    Admin B's platformAdminId.
 * 3. Verify that the returned IShoppingMallAuthCredential.ISummary belongs to
 *    Admin B (actor_type = "platformAdmin", actor_id = Admin B's id, identifier
 *    = Admin B's email) and that high-level activation/lock flags reflect a
 *    fresh, enabled credential without exposing secrets.
 */
export async function test_api_platform_admin_credentials_view_for_other_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin B (the target whose credentials will be inspected)
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminB);

  // 2. Register Admin A (the actor performing the inspection) so that the
  //    connection is authenticated as Admin A at the end of this call.
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminA);

  // Sanity check: ensure Admin A and Admin B are different accounts
  TestValidator.notEquals(
    "Admin A and Admin B must be distinct platform admins",
    adminA.id,
    adminB.id,
  );

  // 3. Admin A inspects Admin B's credential metadata
  const credential: IShoppingMallAuthCredential.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.credentials.at(
      connection,
      {
        platformAdminId: adminB.id,
      },
    );
  typia.assert<IShoppingMallAuthCredential.ISummary>(credential);

  // 4. Business assertions on credential metadata
  TestValidator.equals(
    "credential belongs to a platformAdmin actor",
    credential.actor_type,
    "platformAdmin",
  );

  TestValidator.equals(
    "credential actor_id matches Admin B id",
    credential.actor_id,
    adminB.id,
  );

  TestValidator.equals(
    "credential identifier matches Admin B email",
    credential.identifier,
    adminB.email,
  );

  TestValidator.predicate(
    "newly created credential should be active",
    credential.is_active === true,
  );

  TestValidator.predicate(
    "newly created credential should not be disabled",
    credential.is_disabled === false,
  );

  TestValidator.predicate(
    "newly created credential should not be locked",
    credential.is_locked === false,
  );
}
