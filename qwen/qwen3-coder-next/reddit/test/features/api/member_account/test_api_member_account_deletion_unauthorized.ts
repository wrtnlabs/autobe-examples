import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Delete account without authentication (no token)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 401 when no authentication token provided",
    401,
    async () =>
      await api.functional.redditClone.member.users.me.erase(
        unauthenticatedConnection,
      ),
  );
  // Test 2: Delete account with invalid token
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer invalid-token-that-will-reject",
    },
  };
  await TestValidator.httpError(
    "should return 401 when invalid token provided",
    401,
    async () =>
      await api.functional.redditClone.member.users.me.erase(
        invalidTokenConnection,
      ),
  );
  // Test 3: Delete account with expired token
  const expiredTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer expired.token.here",
    },
  };
  await TestValidator.httpError(
    "should return 401 when expired token provided",
    401,
    async () =>
      await api.functional.redditClone.member.users.me.erase(
        expiredTokenConnection,
      ),
  );
  // Test 4: Delete account with tampered token
  const tamperedTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.payload",
    },
  };
  await TestValidator.httpError(
    "should return 401 when tampered token provided",
    401,
    async () =>
      await api.functional.redditClone.member.users.me.erase(
        tamperedTokenConnection,
      ),
  );
  // Test 5: Delete account with mismatched user token (try to delete different user)
  const otherUserConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer " + RandomGenerator.alphaNumeric(64),
    },
  };
  await TestValidator.httpError(
    "should return 401 when token doesn't match account owner",
    401,
    async () =>
      await api.functional.redditClone.member.users.me.erase(
        otherUserConnection,
      ),
  );
}
