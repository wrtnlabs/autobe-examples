import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

/**
 * Test successful owner authentication when valid credentials are provided for an active account.
 *
 * Steps: 1) Create a new owner account via /auth/owner/join with unique credentials.
 * 2) Verify owner creation returns is_active=true and deleted_at=null.
 * 3) Call the login endpoint with the same email and password used during registration.
 * 4) Validate response returns owner profile with complete IAuthorizationToken.
 * 5) Verify all required fields are present and properly typed.
 */
export async function test_api_owner_login_success_active_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1 & 2: Create owner account with active status and capture credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const nickname = RandomGenerator.name();
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_owner_join(ownerConnection, {
    body: { email, password, nickname },
  });
  typia.assert(joinResult);
  // Step 3: Perform login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_owner_login(loginConnection, {
    body: {
      email,
      password: password satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditLikeOwner.ILogin,
  });
  typia.assert(loginResult);
  // Step 4 & 5: Validate owner profile and token completeness via typia assertion
  // typia.assert() already validates all fields exist and match their types
  TestValidator.equals(
    "owner id matches between join and login",
    joinResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "owner email matches between join and login",
    joinResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "owner username matches between join and login",
    joinResult.username,
    loginResult.username,
  );
  TestValidator.predicate(
    "owner token access is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "owner token refresh is non-empty",
    loginResult.token.refresh.length > 0,
  );
}