import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test self-demotion prevention for super administrators.
 *
 * This test verifies that a super administrator cannot demote themselves,
 * which is a critical security rule ensuring at least one super administrator
 * always remains on the platform.
 */
export async function test_api_super_admin_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and register
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  const authorized = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    { body: joinBody },
  );
  typia.assert(authorized);
  // 2. Attempt self-demotion - should be rejected
  const updateBody = {
    grade: "regular",
  } satisfies IEcommerceMallSuperAdmin.IUpdate;
  await TestValidator.error("self-demotion should be rejected", async () => {
    await api.functional.ecommerceMall.superAdmin.super_admins.update(
      superAdminConnection,
      {
        superAdminId: authorized.id,
        body: updateBody,
      },
    );
  });
}
