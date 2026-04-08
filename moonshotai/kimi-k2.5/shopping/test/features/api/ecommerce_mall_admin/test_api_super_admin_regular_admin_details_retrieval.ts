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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_regular_admin_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Create regular admin
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: regularAdminEmail,
      password: regularAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(regularAdmin);
  // 3. Super admin retrieves regular admin details
  const retrievedAdmin =
    await api.functional.ecommerceMall.superAdmin.admins.at(
      superAdminConnection,
      {
        adminId: regularAdmin.id,
      },
    );
  typia.assert(retrievedAdmin);
  // 4. Validate the response shows grade='regular' and appropriate status
  TestValidator.equals("grade is regular", retrievedAdmin.grade, "regular");
  TestValidator.predicate(
    "status is valid (active, suspended, or banned)",
    retrievedAdmin.status === "active" ||
      retrievedAdmin.status === "suspended" ||
      retrievedAdmin.status === "banned",
  );
  TestValidator.equals(
    "email matches",
    retrievedAdmin.email,
    regularAdmin.email,
  );
  TestValidator.equals("id matches", retrievedAdmin.id, regularAdmin.id);
}
