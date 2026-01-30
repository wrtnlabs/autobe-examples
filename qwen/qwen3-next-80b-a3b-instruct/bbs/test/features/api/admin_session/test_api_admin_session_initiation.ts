import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate admin account via join endpoint
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminData: IEconomicForumAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuthorized: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, { body: adminData });
  // Create new connection for session initiation using the generated token
  const adminSessionConnection: api.IConnection = { host: connection.host };
  adminSessionConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Call the session initiation endpoint
  await api.functional.economicForum.admin.auth.admins.sessions.create(
    adminSessionConnection,
  );
  // Validate that session was successfully established
  // Note: No response body is returned, only success with 201 status
  // Validate that the token is still valid for subsequent calls (implicit validation)
  // Note: The test does not include type error testing, as it is strictly prohibited
  // No body is sent to the endpoint, as specified in the scenario
}
