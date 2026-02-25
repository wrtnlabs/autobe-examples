import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an owner account first
  const adminConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: "owner@test.com",
    password: "SecurePass123!",
    username: "testowner123",
    displayName: "Test Owner",
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(adminConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // Step 2: Attempt login with valid email but wrong password
  const invalidLoginConnection: api.IConnection = { host: connection.host };
  const invalidLoginData = {
    email: "owner@test.com",
    password: "WrongPassword123!",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies IRedditCloneOwner.ILogin;
  // Validate that login with invalid password throws 401 error
  await TestValidator.httpError(
    "should reject login with invalid password",
    401,
    async () => {
      await api.functional.redditClone.auth.owner.login(
        invalidLoginConnection,
        { body: invalidLoginData },
      );
    },
  );
}
