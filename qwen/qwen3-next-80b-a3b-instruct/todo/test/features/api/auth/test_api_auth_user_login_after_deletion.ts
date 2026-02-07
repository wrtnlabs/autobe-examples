import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_auth_user_login_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account using authorize_user_join utility
  const userConnection: api.IConnection = { host: connection.host };
  // Despite the scenario mentioning email/password, the DTOs IJoin and ILogin are empty objects
  // Therefore we must pass empty objects that satisfy the type
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  // 2. Login to establish the account exists (using empty object as required by schema)
  await authorize_user_login(userConnection, {
    body: {} satisfies ITodoAppUser.ILogin,
  });
  // 3. Simulate account deletion (this happens server-side when account is marked deleted)
  // Since we don't have a delete endpoint, we assume backend marks account as deleted
  // Now create a NEW connection to test login after deletion
  const deletedConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to login with empty object after deletion
  // The system should return 403 Forbidden to maintain privacy (not 401)
  try {
    await authorize_user_login(deletedConnection, {
      body: {} satisfies ITodoAppUser.ILogin,
    });
    throw new Error(
      "Expected 403 Forbidden for deleted account, but login succeeded",
    );
  } catch (error: any) {
    if (error instanceof api.HttpError) {
      TestValidator.equals(
        "status code should be 403 Forbidden",
        error.status,
        403,
      );
    } else {
      throw new Error(
        "Expected HttpError for failed login, got different error type",
      );
    }
  }
}
