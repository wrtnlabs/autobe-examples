import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get valid tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Save the valid refresh token
  const validRefreshToken = joinResult.token.refresh;
  // 3. Create invalid token by modifying a single character
  const invalidRefreshToken =
    validRefreshToken.substring(0, validRefreshToken.length - 1) +
    (validRefreshToken[validRefreshToken.length - 1] === "a" ? "b" : "a");
  // 4. Try to refresh with invalid token - should return 401 Unauthorized
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "invalid refresh token rejected with 401",
    401,
    async () => {
      await api.functional.hrms.auth.member.refresh(invalidRefreshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IHrmsMember.IRefresh,
      });
    },
  );
  // 5. Verify valid token still works
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const validRefreshResult = await authorize_member_refresh(
    validRefreshConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IHrmsMember.IRefresh,
    },
  );
  typia.assert(validRefreshResult);
  // 6. Verify we got a new access token (not the old one)
  TestValidator.notEquals(
    "new access token issued",
    joinResult.token.access,
    validRefreshResult.token.access,
  );
  // 7. Verify refreshable_until is extended (or at least updated)
  TestValidator.notEquals(
    "refresh deadline extended",
    joinResult.token.refreshable_until,
    validRefreshResult.token.refreshable_until,
  );
}
