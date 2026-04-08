import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and register new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const input: IRedditCommunityAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityAdmin.IJoin;
  const output: IRedditCommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: input },
  );
  typia.assert(output);
  // 2. Validate response structure and business logic
  TestValidator.equals("admin email matches input", output.email, input.email);
  TestValidator.equals("display_name is null", output.display_name, null);
  TestValidator.equals("is_active is true", output.is_active, true);
  TestValidator.equals("deleted_at is null", output.deleted_at, null);
  // 3. Validate timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(new Date(output.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(new Date(output.updated_at).getTime()),
  );
  // 4. Validate authorization token structure
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(new Date(output.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(new Date(output.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    output.token.refreshable_until > output.token.expired_at,
  );
  // 5. Verify admin can authenticate by refreshing token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshOutput: IRedditCommunityAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: { refresh_token: output.token.refresh },
    });
  typia.assert(refreshOutput);
  // 6. Verify refresh returns consistent admin data
  TestValidator.equals(
    "refreshed email matches original",
    refreshOutput.email,
    input.email,
  );
  TestValidator.equals(
    "refreshed is_active is true",
    refreshOutput.is_active,
    true,
  );
  TestValidator.equals(
    "refreshed admin id matches original",
    refreshOutput.id,
    output.id,
  );
}
