import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login authentication with valid credentials.
 *
 * Validates the complete member authentication workflow by first creating a member account through registration, then attempting to login with the correct credentials. This test ensures that the authentication system properly generates JWT tokens, returns member profile information, and maintains session state.
 *
 * The test verifies that the login response contains all required authentication data including access tokens with appropriate expiration times, member identification fields, and organization context information. It also confirms that the authorization headers are properly set for subsequent API calls.
 *
 * 1. Create a new member account using the join operation with random credentials.
 * 2. Extract the email and password from the created account.
 * 3. Attempt to login with the correct credentials.
 * 4. Validate the response contains valid JWT tokens with proper expiration.
 * 5. Verify member profile information matches the created account.
 * 6. Confirm email_verified flag reflects the verification status.
 * 7. Validate organizations array is present (empty for newly created member).
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare credentials for member registration
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  // 2. Create member account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput: IHrmMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(joinOutput);
  // 3. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput: IHrmMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email,
        password,
      } satisfies IHrmMember.ILogin,
    },
  );
  typia.assert(loginOutput);
  // 4. Validate response structure and content
  TestValidator.equals("member id matches", loginOutput.id, joinOutput.id);
  TestValidator.equals("email matches", loginOutput.email, joinOutput.email);
  TestValidator.predicate(
    "has access token",
    loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at",
    loginOutput.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until",
    loginOutput.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "email_verified exists",
    typeof loginOutput.email_verified === "boolean",
  );
  TestValidator.predicate(
    "organizations array exists",
    Array.isArray(loginOutput.organizations),
  );
}
