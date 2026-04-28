import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validates refresh token rotation security mechanism for member authentication.
 *
 * Tests that the authentication system properly implements token rotation by issuing new refresh tokens while invalidating previous ones on each refresh operation. This prevents replay attacks where captured tokens could be reused by malicious actors. The test verifies the complete rotation cycle including initial registration, token exchange, rejection of expired tokens, and continued session functionality with current tokens.
 *
 * Special attention is given to ensuring the old refresh token is immediately invalidated after the refresh operation, while the newly issued tokens function correctly for subsequent authentication requests.
 *
 * 1. Member registers and receives initial authorization tokens (access and refresh).
 * 2. Member performs first refresh using the initial refresh token, system issues new token pair and invalidates the old refresh token.
 * 3. Validates that attempting to reuse the initial refresh token fails with authentication error.
 * 4. Validates that the new refresh token from step 2 can successfully perform another refresh, confirming token chain continuity.
 */
export async function test_api_auth_member_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member session and join - captures initial refresh token
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_member_join(
    memberJoinConnection,
    {},
  );
  typia.assert(memberJoinResponse);
  const oldRefreshToken = memberJoinResponse.token.refresh;
  const memberId = memberJoinResponse.id;
  // 2. First refresh - uses initial token, gets new token pair
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResponse = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: { refresh_token: oldRefreshToken },
    },
  );
  typia.assert(firstRefreshResponse);
  // Verify first refresh returns same member
  TestValidator.equals(
    "first refresh email matches",
    firstRefreshResponse.email,
    memberJoinResponse.email,
  );
  TestValidator.equals(
    "first refresh id matches",
    firstRefreshResponse.id,
    memberId,
  );
  const newRefreshToken = firstRefreshResponse.token.refresh;
  // 3. Verify old refresh token is rejected (token rotation worked)
  const invalidTestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token rejected after rotation",
    async () => {
      await api.functional.todoApp.auth.member.refresh(invalidTestConnection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // 4. Second refresh with new token - verify new token is functional
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResponse = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: { refresh_token: newRefreshToken },
    },
  );
  typia.assert(secondRefreshResponse);
  // Verify second refresh returns same member and tokens are different
  TestValidator.equals(
    "second refresh email matches",
    secondRefreshResponse.email,
    memberJoinResponse.email,
  );
  TestValidator.equals(
    "second refresh id matches",
    secondRefreshResponse.id,
    memberId,
  );
  TestValidator.notEquals(
    "refresh token rotated from previous",
    secondRefreshResponse.token.refresh,
    newRefreshToken,
  );
  TestValidator.notEquals(
    "old token is different from new token",
    oldRefreshToken,
    newRefreshToken,
  );
}
