import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_retrieve_own_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Promote the regular administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Retrieve own profile using the super admin's authenticated connection
  const profile =
    await api.functional.eCommerceMall.superAdministrator.super_administrators.at(
      superAdminConnection,
      {
        superAdministratorId: superAdmin.id,
      },
    );
  typia.assert(profile);
  // 4. Validate the profile
  TestValidator.equals("id matches", profile.id, superAdmin.id);
  TestValidator.equals("email matches", profile.email, superAdmin.email);
  // Verify nested administrator object references the original admin
  TestValidator.equals(
    "administrator id matches",
    profile.administrator.id,
    admin.id,
  );
  TestValidator.equals(
    "administrator grade is super",
    profile.administrator.grade,
    "super",
  );
  // Verify timestamps are non-null
  TestValidator.predicate(
    "created_at is non-null",
    profile.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is non-null",
    profile.updated_at !== null,
  );
  // Verify deleted_at is null (active account, not soft-deleted)
  TestValidator.predicate("deleted_at is null", profile.deleted_at === null);
}
