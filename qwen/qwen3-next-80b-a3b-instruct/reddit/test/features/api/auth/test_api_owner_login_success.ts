import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and register an owner account - using utility function
  const ownerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const registeredOwner = await authorize_owner_join(ownerConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(registeredOwner);
  // Step 2: Create a new connection for login using same credentials from registration
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_owner_login(loginConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(loginResponse);
  // Step 3: Validate response structure matches ICommunityPlatformOwner.IAuthorized
  // Owner ID must match registered owner ID
  TestValidator.equals(
    "owner ID matches registration",
    loginResponse.id,
    registeredOwner.id,
  );
  // Validate token fields exist and are non-empty strings
  TestValidator.predicate(
    "access token exists and is non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
  // Validate expiration timestamps exist and are non-empty strings (format is validated by typia.assert)
  TestValidator.predicate(
    "expired_at exists and is non-empty string",
    typeof loginResponse.token.expired_at === "string" &&
      loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists and is non-empty string",
    typeof loginResponse.token.refreshable_until === "string" &&
      loginResponse.token.refreshable_until.length > 0,
  );
  // Validate the token structure as whole
  typia.assert<ICommunityPlatformAuthorizationToken>(loginResponse.token);
}
