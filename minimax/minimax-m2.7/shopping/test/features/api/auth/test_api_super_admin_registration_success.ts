import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super admin actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register a new super administrator using the utility function
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // Validate the complete response structure using typia.assert()
  typia.assert(authorized);
  // Validate business logic - email format is valid
  TestValidator.predicate(
    "email contains @ symbol",
    authorized.email.includes("@"),
  );
  // Validate token pair exists with proper structure
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  // Validate expiration timestamps are valid date-time format
  TestValidator.predicate(
    "access token expiration is valid date-time",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token expiration is valid date-time",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
}
