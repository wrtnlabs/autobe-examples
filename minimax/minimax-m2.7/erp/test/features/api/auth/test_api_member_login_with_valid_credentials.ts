import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via join endpoint
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IErpHrmMember.IJoin;
  const joinResponse = await api.functional.erpHrm.auth.member.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joinResponse);
  // 2. Login with the same credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: joinBody.href,
    referrer: joinBody.referrer,
  } satisfies IErpHrmMember.ILogin;
  const loginResponse = await api.functional.erpHrm.auth.member.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "email matches input",
    loginResponse.email,
    joinBody.email,
  );
  TestValidator.equals(
    "display_name matches input",
    loginResponse.display_name,
    joinBody.display_name,
  );
  TestValidator.equals(
    "displayName matches input",
    loginResponse.displayName,
    joinBody.display_name,
  );
  // 4. Validate token structure
  TestValidator.predicate(
    "access token is non-empty string",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !!Date.parse(loginResponse.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !!Date.parse(loginResponse.token.refreshable_until),
  );
  // 5. Verify tokens are strings (type validation via typia.assert already done)
  const accessToken: string = loginResponse.token.access;
  const refreshToken: string = loginResponse.token.refresh;
}
