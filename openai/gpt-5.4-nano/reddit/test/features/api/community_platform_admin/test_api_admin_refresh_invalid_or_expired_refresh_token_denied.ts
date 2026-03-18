import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_invalid_or_expired_refresh_token_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin joins to obtain a refreshable token context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2) Use an invalid/expired refresh token.
  // Note: According to the provided DTO contract, refreshToken is constrained to `null`.
  // So we must send `null` to represent an invalid refresh credential.
  const refreshInput = {
    refreshToken: null,
  } satisfies ICommunityPlatformAdmin.IRefresh;
  // 3) Call refresh and ensure it is denied with 401
  await TestValidator.httpError(
    "refresh should reject invalid refresh token",
    401,
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: refreshInput,
      });
    },
  );
}
