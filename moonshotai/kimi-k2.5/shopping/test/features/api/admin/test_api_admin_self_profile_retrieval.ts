import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_self_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies Partial<IEcommerceMallAdmin.IJoin>,
  });
  // 2. Retrieve own admin profile
  const profile = await api.functional.ecommerceMall.admin.admins.at(
    adminConnection,
    {
      adminId: authorized.id,
    },
  );
  typia.assert(profile);
  // 3. Validate profile data matches the created admin
  TestValidator.equals(
    "ID matches requested adminId",
    profile.id,
    authorized.id,
  );
  TestValidator.equals("Email matches", profile.email, authorized.email);
  TestValidator.equals("Grade matches", profile.grade, authorized.grade);
  TestValidator.equals("Status matches", profile.status, authorized.status);
  TestValidator.equals(
    "Nickname matches",
    profile.nickname,
    authorized.nickname,
  );
  TestValidator.equals(
    "Created_at matches",
    profile.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "Updated_at matches",
    profile.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "Deleted_at matches",
    profile.deleted_at,
    authorized.deleted_at,
  );
  // 4. Verify password_hash is NOT exposed in response for security
  TestValidator.predicate(
    "password_hash not exposed in response",
    () => !("password_hash" in profile),
  );
}
