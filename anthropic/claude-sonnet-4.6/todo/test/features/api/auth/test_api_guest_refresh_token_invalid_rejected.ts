import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_invalid_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Perform guest join as prerequisite to establish a valid session context
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Test with a completely random non-JWT string as refresh token
  const invalidRandomToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.httpError(
    "invalid random string token should be rejected with 401",
    401,
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refreshToken: invalidRandomToken,
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
  // Step 3: Test with a well-formed but forged JWT string (invalid signature)
  // A fake JWT: header.payload.signature with tampered/forged content
  const fakeJwtHeader = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"}
  const fakeJwtPayload =
    "eyJzdWIiOiJmYWtlLWd1ZXN0LWlkIiwic2Vzc2lvbklkIjoiZmFrZS1zZXNzaW9uLWlkIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9"; // fake claims
  const fakeJwtSignature = RandomGenerator.alphaNumeric(43); // forged/random signature
  const forgedJwtToken = `${fakeJwtHeader}.${fakeJwtPayload}.${fakeJwtSignature}`;
  await TestValidator.httpError(
    "forged JWT with invalid signature should be rejected with 401",
    401,
    async () => {
      const refreshConnection2: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection2, {
        body: {
          refreshToken: forgedJwtToken,
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
}
