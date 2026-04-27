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

export async function test_api_member_token_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member to understand the valid reference structure
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: typia.random<ITodoAppMember.IJoin>(),
  });
  typia.assert(authorized);
  // Utility for base64url encoding without extra imports
  const base64url = (str: string): string =>
    btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  // 2. Scenario 1: Random non-JWT string
  await TestValidator.httpError(
    "random non-JWT string should be rejected with 401",
    401,
    async () => {
      await api.functional.todoApp.auth.member.refresh(
        { host: connection.host },
        {
          body: {
            refresh_token: RandomGenerator.alphaNumeric(20),
          } satisfies ITodoAppMember.IRefresh,
        },
      );
    },
  );
  // 3. Scenario 2: Syntactically valid JWT with invalid signature (tampered payload)
  const headerB64 = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = base64url(
    JSON.stringify({
      sub: authorized.id,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  const tamperedJwt = `${headerB64}.${payloadB64}.tampered_signature_here`;
  await TestValidator.httpError(
    "JWT with invalid signature should be rejected with 401",
    401,
    async () => {
      await api.functional.todoApp.auth.member.refresh(
        { host: connection.host },
        {
          body: {
            refresh_token: tamperedJwt,
          } satisfies ITodoAppMember.IRefresh,
        },
      );
    },
  );
  // 4. Scenario 3: Expired JWT (exp claim in the past)
  const expiredPayloadB64 = base64url(
    JSON.stringify({
      sub: authorized.id,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
    }),
  );
  const expiredJwt = `${headerB64}.${expiredPayloadB64}.invalid_signature`;
  await TestValidator.httpError(
    "expired JWT should be rejected with 401",
    401,
    async () => {
      await api.functional.todoApp.auth.member.refresh(
        { host: connection.host },
        {
          body: {
            refresh_token: expiredJwt,
          } satisfies ITodoAppMember.IRefresh,
        },
      );
    },
  );
}
