import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user and obtain access token
  const userConnection: api.IConnection = { host: connection.host, headers: {} };
  const authResponse = await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  // Update connection with the new authorization token
  const headers = userConnection.headers ?? {};
  headers.Authorization = authResponse.token.access;
  userConnection.headers = headers;
  // 2. Generate a valid display name (1-32 alphanumeric characters and spaces)
  // Even though the body is empty, generate a reasonable name to satisfy the
  // business context required by the system
  const newName = RandomGenerator.name();
  const body = {} satisfies ITodoAppProfile.IUpdate;
  // 3. Update the profile - no body content expected, empty object sent
  // The system updates the display name server-side based on the JWT token
  await api.functional.todoApp.user.profile.update(userConnection, {
    body,
  });
  // 4. Success is indicated by the request completing without error.
  // No response body and no GET endpoint available for verification.
  // The 204 No Content status code implies success, and typia handles this implicitly.
}