import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for login test
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    avatar_image: typia.random<string & tags.Format<"uri">>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // 2. Validate join response contains member profile
  TestValidator.equals(
    "email matches join input",
    joinResult.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "display_name matches",
    joinResult.display_name,
    joinCredentials.display_name,
  );
  TestValidator.predicate(
    "account is active (not deleted)",
    joinResult.deleted_at === null,
  );
  // 3. Login with the created credentials
  const loginCredentials: IHrmPlatformMember.ILogin = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // 4. Validate login response matches member profile
  TestValidator.equals(
    "email matches login input",
    loginResult.email,
    loginCredentials.email,
  );
  TestValidator.equals(
    "display_name matches join",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals("member id matches join", loginResult.id, joinResult.id);
  TestValidator.equals(
    "avatar_image matches",
    loginResult.avatar_image,
    joinResult.avatar_image,
  );
  TestValidator.equals(
    "phone_number matches",
    loginResult.phone_number,
    joinResult.phone_number,
  );
  // 5. Validate authentication tokens exist
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  // 6. Validate token expiration logic
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // 7. Verify the connection was updated with the access token
  TestValidator.predicate(
    "loginConnection has Authorization header",
    loginConnection.headers !== undefined,
  );
  if (loginConnection.headers !== undefined) {
    TestValidator.equals(
      "Authorization header matches access token",
      loginConnection.headers.Authorization,
      loginResult.token.access,
    );
  }
}
