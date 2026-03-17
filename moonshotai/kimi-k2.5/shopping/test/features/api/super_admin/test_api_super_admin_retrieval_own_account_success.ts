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

export async function test_api_super_admin_retrieval_own_account_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin specific connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate join credentials with all required fields
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    href: "http://localhost:3000/super-admin/join",
    referrer: "http://localhost:3000/",
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  // Step 1: Join as super admin to create account and establish authentication
  // The join function automatically sets the Authorization header on the connection
  const authorized = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorized);
  // Step 2: Retrieve own account information using the ID from the join response
  const account = await api.functional.ecommerceMall.superAdmin.super_admins.at(
    superAdminConnection,
    {
      superAdminId: authorized.id,
    },
  );
  typia.assert(account);
  // Step 3: Validate the retrieved account matches the created account
  TestValidator.equals(
    "retrieved account email matches",
    account.email,
    joinBody.email,
  );
  TestValidator.equals(
    "retrieved account id matches",
    account.id,
    authorized.id,
  );
}
