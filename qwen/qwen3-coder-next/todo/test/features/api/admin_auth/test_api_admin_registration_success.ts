import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
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
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid admin registration data
  const joinInput = typia.random<ITodoAppAdminSession.IJoin>();
  // Register new admin account using utility function
  const output: ITodoAppAdminSession.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: joinInput,
    },
  );
  // Validate response structure
  typia.assert(output);
  // Verify response contains expected fields
  TestValidator.equals("response has admin id", typeof output.id, "string");
  TestValidator.equals("response has email", typeof output.email, "string");
  TestValidator.equals("response has token", typeof output.token, "object");
  // Verify token structure
  TestValidator.equals(
    "token has access field",
    typeof output.token.access,
    "string",
  );
  TestValidator.equals(
    "token has refresh field",
    typeof output.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token has expired_at field",
    typeof output.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token has refreshable_until field",
    typeof output.token.refreshable_until,
    "string",
  );
  // Verify email matches input
  TestValidator.equals("email matches input", output.email, joinInput.email);
  // Verify UUID format for admin id
  TestValidator.predicate(
    "admin id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Verify date-time format for token expiration fields
  TestValidator.predicate(
    "expired_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      output.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      output.token.refreshable_until,
    ),
  );
}
