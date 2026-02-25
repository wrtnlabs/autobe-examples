import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a user account first with a specific password
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const userConnection: api.IConnection = { host: connection.host };
  const createdUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(createdUser);
  // Now login with the exact same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_user_login(loginConnection, {
    body: {
      email: createdUser.email,
      password: originalPassword,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);
  // Validate user information matches
  TestValidator.equals(
    "user id should match",
    loginResponse.id,
    createdUser.id,
  );
  TestValidator.equals(
    "email should match",
    loginResponse.email,
    createdUser.email,
  );
  TestValidator.equals(
    "display name should match",
    loginResponse.display_name,
    createdUser.display_name,
  );
  TestValidator.equals(
    "created_at should match",
    loginResponse.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "updated_at should match",
    loginResponse.updated_at,
    createdUser.updated_at,
  );
  // Validate token structure using typia.assert for complete validation
  const token = loginResponse.token;
  typia.assert<IAuthorizationToken>(token);
  // Additional validations for token presence
  TestValidator.predicate("access token should exist", !!token.access);
  TestValidator.predicate("refresh token should exist", !!token.refresh);
  TestValidator.predicate(
    "expired_at should be valid date-time",
    !!token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until should be valid date-time",
    !!token.refreshable_until,
  );
  // Validate timestamps are properly formatted and in the future
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "expired_at should be valid ISO string",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO string",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil > expiredAt,
  );
}
