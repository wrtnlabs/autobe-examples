import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_profile_self_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new super admin connection and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joined);
  // 2. Self-retrieve the super admin's own profile using their own ID
  const profile = await api.functional.shoppingMall.superAdmin.superAdmins.at(
    superAdminConnection,
    {
      superAdminId: joined.id,
    },
  );
  typia.assert(profile);
  // 3. Validate business logic: ID matches, email matches, deleted_at is null
  TestValidator.equals("profile id matches own id", profile.id, joined.id);
  TestValidator.equals(
    "profile email matches registered email",
    profile.email,
    joined.email,
  );
  TestValidator.equals(
    "profile deleted_at is null (active account)",
    profile.deleted_at,
    null,
  );
}
