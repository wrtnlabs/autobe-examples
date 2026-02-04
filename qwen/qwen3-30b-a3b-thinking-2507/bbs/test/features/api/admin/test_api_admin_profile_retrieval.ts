import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
) {
  // Create a connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconPoliticBoardAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {},
    },
  );
  // Retrieve admin profile using the ID
  const retrievedAdmin: IEconPoliticBoardAdmin =
    await api.functional.econPoliticBoard.admins.at(adminConnection, {
      adminId: admin.id,
    });
  // Validate all profile properties
  typia.assert(retrievedAdmin);
  TestValidator.equals("id matches", retrievedAdmin.id, admin.id);
  TestValidator.equals("email matches", retrievedAdmin.email, admin.email);
  TestValidator.equals("role matches", retrievedAdmin.role, admin.role);
  TestValidator.equals("status matches", retrievedAdmin.status, admin.status);
  TestValidator.equals(
    "createdAt matches",
    retrievedAdmin.createdAt,
    admin.createdAt,
  );
}
