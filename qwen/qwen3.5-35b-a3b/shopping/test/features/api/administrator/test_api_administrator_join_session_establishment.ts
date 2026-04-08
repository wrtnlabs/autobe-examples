import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_session_establishment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  const registrationDisplayName = RandomGenerator.name(3);
  const authorized: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(joinConnection, {
      body: {
        display_name: registrationDisplayName,
        email: registrationEmail,
        password: registrationPassword,
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(authorized);
  // 2. Validate JWT token structure
  typia.assert(authorized.token);
  typia.assertGuard(authorized.token.access);
  typia.assertGuard(authorized.token.refresh);
  typia.assertGuard(authorized.token.expired_at);
  typia.assertGuard(authorized.token.refreshable_until);
  // 3. Validate token fields are non-empty
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 4. Validate token expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorized.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(authorized.token.refreshable_until) > now,
  );
  // 5. Validate authorized response structure
  typia.assert(authorized);
  // 6. Verify grade is regular and is_banned is false
  TestValidator.equals("grade is regular", authorized.grade, "regular");
  TestValidator.equals("is_banned is false", authorized.is_banned, false);
  // 7. Verify email matches registration
  TestValidator.equals(
    "email matches registration",
    authorized.email,
    registrationEmail,
  );
  // 8. Verify display name matches registration
  TestValidator.equals(
    "display_name matches registration",
    authorized.display_name,
    registrationDisplayName,
  );
  // 9. Verify timestamps are valid ISO 8601 date-time format
  const createdAt = new Date(authorized.created_at);
  const updatedAt = new Date(authorized.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  // 10. Verify deleted_at is null for new registration
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // 11. Verify session was established by checking token is valid
  // The fact that we received a response means the token was generated and stored
  // If the token was invalid or session creation failed, we would get an error
  // Here we validate the tokens have the expected JWT-like structure
  const accessParts = authorized.token.access.split(".");
  TestValidator.equals("access token has 3 JWT parts", accessParts.length, 3);
  const refreshParts = authorized.token.refresh.split(".");
  TestValidator.equals("refresh token has 3 JWT parts", refreshParts.length, 3);
}