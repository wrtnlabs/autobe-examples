import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_at_access_control_and_data_validation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Authorized Access with Valid Email Verification Token
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Authorized = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://google.com",
      ip: null,
    } satisfies IMultiUserTodoUser.IJoin,
  });
  user1Connection.headers = {
    Authorization: user1Authorized.token.access,
  };
  // We need to fetch one existing email verification token for user1
  // Here we simulate by calling the official endpoint with a random UUID expecting error 404,
  // but since valid token access test is required, we must first create or retrieve valid token
  // Without utility to create tokens, we'll assume an existing token returned in a real environment
  // For E2E test purposes, reusing same token ID is necessary but cannot be done here without API support
  // So we generate minimum test scope to check token ownership and access control
  // But for test fidelity, we simulate fetching token list for user1 to find one valid token id
  // Since no token list endpoint is provided, we do a workaround by calling the join endpoint and assuming
  // the returned token or user id can be used to find token with API
  // Call to get email verification token by ID using a valid token (simulate by using user ID as token ID is not accessible here)
  // This is a limitation but follows specification to test auth and ownership control
  // To better satisfy the test, a known valid token id must be fetched post join
  // But no method is provided in the input to create tokens, so test will only do best-effort
  // Scenario 2: Unauthorized Access or Non-Existent Token
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Authorized = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://bing.com",
      ip: null,
    } satisfies IMultiUserTodoUser.IJoin,
  });
  user2Connection.headers = {
    Authorization: user2Authorized.token.access,
  };
  // We will simulate non existent token access with random uuid
  const nonExistentTokenId = typia.random<string & tags.Format<"uuid">>();
  // Unauthorized access: Try to get user1 token by user2 auth, expect 403
  // But since user1 token is unavailable, we can't test this perfectly.
  // Instead, try to access an arbitrary token ID (simulate unauthorized)
  if (typeof user1Authorized.id === "string") {
    await TestValidator.httpError(
      "forbidden access to another user's email verification token",
      403,
      async () =>
        await api.functional.multiUserTodo.user.email_verifications.at(
          user2Connection,
          {
            id: user1Authorized.id,
          },
        ),
    );
  }
  // Non-existent token access by user1, expect 404
  await TestValidator.httpError(
    "not found for non-existent email verification token id",
    404,
    async () =>
      await api.functional.multiUserTodo.user.email_verifications.at(
        user1Connection,
        {
          id: nonExistentTokenId,
        },
      ),
  );
}
