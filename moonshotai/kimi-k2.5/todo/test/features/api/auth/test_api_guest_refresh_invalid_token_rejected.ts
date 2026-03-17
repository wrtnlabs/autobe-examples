import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_invalid_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a clean connection for testing invalid token rejection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate a syntactically valid but non-existent refresh token
  // Format: header.payload.signature (base64 encoded parts separated by dots)
  const invalidRefreshToken = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // header
    "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ", // payload
    RandomGenerator.alphaNumeric(64), // fake signature
  ].join(".");
  // 3. Verify that the refresh endpoint rejects the invalid token
  await TestValidator.httpError(
    "invalid refresh token should be rejected",
    401,
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies IMultiUserTodoGuest.IRefresh,
      });
    },
  );
}
