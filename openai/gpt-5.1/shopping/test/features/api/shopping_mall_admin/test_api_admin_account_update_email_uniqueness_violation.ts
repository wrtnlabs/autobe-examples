import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_account_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Arrange: create three distinct admins via join
  const baseHref = "https://admin.test.local/join" as string &
    tags.Format<"uri">;
  const baseReferrer = "https://admin.test.local/landing" as string &
    tags.Format<"uri">;

  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminCEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  // Admin A join – this also authenticates the connection as Admin A
  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminAEmail,
      password,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  // Admin B join – creates another admin; SDK will switch token to Admin B
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminBEmail,
      password,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  // Admin C join – creates third admin; SDK will switch token to Admin C
  const adminC = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminCEmail,
      password,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminC);

  // Basic sanity: emails are distinct across the three authorized payloads
  TestValidator.notEquals(
    "admin A and B emails must differ",
    adminA.email,
    adminB.email,
  );
  TestValidator.notEquals(
    "admin B and C emails must differ",
    adminB.email,
    adminC.email,
  );
  TestValidator.notEquals(
    "admin A and C emails must differ",
    adminA.email,
    adminC.email,
  );

  // 2. Act: attempt to update Admin B so that its email collides with Admin C
  // Per the provided SDK, update requires adminId and an IShoppingMallAdmin.IUpdate body.
  const updateBody = {
    email: adminC.email,
  } satisfies IShoppingMallAdmin.IUpdate;

  // We expect the backend to enforce the unique index on email and reject this.
  await TestValidator.error(
    "updating to duplicate email must fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(connection, {
        adminId: adminB.id,
        body: updateBody,
      });
    },
  );
}
