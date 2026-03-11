import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Create new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEconomicPoliticalBoardMember.IJoin;
  const joinResponse = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResponse);
  // 2. Login with created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IEconomicPoliticalBoardMember.ILogin;
  const loginResponse = await authorize_member_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginResponse);
  // 3. Validate member ID (UUID format)
  TestValidator.predicate(
    "member ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResponse.id,
    ),
  );
  // 4. Validate access token exists
  TestValidator.predicate(
    "access token is present",
    loginResponse.token.access.length > 0,
  );
  // 5. Validate refresh token exists
  TestValidator.predicate(
    "refresh token is present",
    loginResponse.token.refresh.length > 0,
  );
  // 6. Validate access token has expiration timestamp
  TestValidator.predicate(
    "access token has expired_at timestamp",
    loginResponse.token.expired_at.length > 0,
  );
  // 7. Validate refreshable_until timestamp
  TestValidator.predicate(
    "refresh token has refreshable_until timestamp",
    loginResponse.token.refreshable_until.length > 0,
  );
  // 8. Validate access token is JWT format (base64url with dots)
  TestValidator.predicate(
    "access token is valid JWT format",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      loginResponse.token.access,
    ),
  );
  // 9. Validate refresh token is JWT format (base64url with dots)
  TestValidator.predicate(
    "refresh token is valid JWT format",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      loginResponse.token.refresh,
    ),
  );
  // 10. Validate timestamps are ISO 8601 format
  const expiredDate = new Date(loginResponse.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(expiredDate.getTime()),
  );
  const refreshableDate = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(refreshableDate.getTime()),
  );
}
