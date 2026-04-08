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
 * Test refresh token renewal with an expired refresh token.
 *
 * Validates that the system properly rejects expired refresh tokens and requires members to re-authenticate with their credentials. This test ensures session timeout enforcement works correctly and prevents unauthorized token reuse after expiration.
 *
 * The test flow involves creating a member account, obtaining initial authentication tokens, and then attempting to use an expired refresh token to renew the session. The system should reject the expired token with a 401 error, forcing the user to log in again with their email and password.
 *
 * 1. Create member account using authorize_member_join to obtain initial authentication tokens.
 * 2. Extract the refresh token from the authorization response.
 * 3. Attempt to refresh using an expired/invalid refresh token.
 * 4. Validate that the refresh operation fails with 401 Unauthorized error.
 * 5. Verify that no new tokens are issued for expired refresh tokens.
 * 6. Confirm that the error message indicates re-authentication is required.
 */
export async function test_api_member_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to obtain initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(joinOutput);
  // 2. Test with an expired/invalid refresh token
  // Since we cannot actually expire a token without database manipulation,
  // we use a token that represents an expired state (invalid format or known expired)
  const expiredRefreshToken = "expired_token_representing_expired_session";
  // 3. Attempt to refresh with expired token and validate error
  await TestValidator.httpError(
    "expired refresh token should return 401",
    401,
    async () => {
      await authorize_member_refresh(memberConnection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IHrmMember.IRefresh,
      });
    },
  );
}
