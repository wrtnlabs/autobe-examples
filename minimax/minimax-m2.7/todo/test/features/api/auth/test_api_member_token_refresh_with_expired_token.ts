import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account to obtain valid tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IMultiUserTodoMember.IAuthorized =
    await api.functional.multiUserTodo.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        displayName: RandomGenerator.name(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Construct an expired refresh token by modifying the JWT payload
  // Decode base64url without Buffer - using atob polyfill approach
  const base64UrlDecode = (str: string): string => {
    // Replace URL-safe chars and add padding
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    // Decode using atob (available in Node.js and browsers)
    return atob(padded);
  };
  const base64UrlEncode = (str: string): string => {
    // Encode using btoa, then replace chars for URL-safe base64
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const parts = authorized.token.refresh.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  // Decode the payload
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  // Set expiration to a past date (Unix epoch)
  payload.exp = 0;
  payload.iat = 0;
  // Re-encode the modified payload
  const modifiedPayload = base64UrlEncode(JSON.stringify(payload));
  // Construct expired token with modified payload (signature will be invalid, triggering auth error)
  const expiredToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;
  // 3. Attempt to refresh with the expired token - should fail with 401 Unauthorized
  await TestValidator.httpError(
    "expired refresh token should be rejected with 401",
    401,
    async () =>
      await api.functional.multiUserTodo.auth.member.refresh(connection, {
        body: {
          refresh_token: expiredToken,
        } satisfies IMultiUserTodoMember.IRefresh,
      }),
  );
}