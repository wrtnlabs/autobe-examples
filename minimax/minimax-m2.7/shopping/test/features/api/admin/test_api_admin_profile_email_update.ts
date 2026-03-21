import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_profile_email_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create SuperAdmin B (target admin account to be updated)
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB = await authorize_super_admin_join(superAdminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminB);
  // 2. Create SuperAdmin A (acting super administrator who will perform the update)
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_admin_join(superAdminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminA);
  // 3. Generate a new unique email for SuperAdmin B
  const newEmail = typia.random<string & tags.Format<"email">>();
  // 4. SuperAdmin A updates SuperAdmin B's email address
  const updatedAdmin =
    await api.functional.ecommerceMall.superAdmin.admins.update(
      superAdminAConnection,
      {
        adminId: superAdminB.id,
        body: {
          email: newEmail,
        } satisfies IEcommerceMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);
  // 5. Validate the update response
  TestValidator.equals("admin id preserved", updatedAdmin.id, superAdminB.id);
  TestValidator.equals(
    "email updated to new value",
    updatedAdmin.email,
    newEmail,
  );
  TestValidator.predicate(
    "updated_at is set",
    updatedAdmin.updated_at !== null && updatedAdmin.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedAdmin.deleted_at,
    null,
  );
}
