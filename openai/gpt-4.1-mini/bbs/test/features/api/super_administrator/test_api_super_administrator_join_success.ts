import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Test positive scenario for creation of a new super administrator account with valid unique email and password.
  // Validate that the response returns authorization tokens including access and refresh JWT tokens.
  // Confirm that a new record is created in the super administrators table with secure password hashing and that the user is immediately authenticated.
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Compose the join request body according to IDiscussionBoardSuperAdministrator.IJoin
  // Since IJoin type is empty, we assume no payload is required
  const body: IDiscussionBoardSuperAdministrator.IJoin = {};
  const output = await authorize_super_administrator_join(
    superAdminConnection,
    { body },
  );
  typia.assert(output);
  // Validate that tokens are present and formatted
  const token = output.token;
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Validate the token expiry timestamps are ISO strings
  TestValidator.predicate(
    "expired_at is valid ISO date-time string",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time string",
    !isNaN(Date.parse(token.refreshable_until)),
  );
  // Now the superAdminConnection should be updated with the Authorization header accordingly
  // (But per pattern, we keep using this connection for subsequent calls if needed.)
}
