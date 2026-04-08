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

export async function test_api_admin_registration_with_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration data with display_name
  const display_name = RandomGenerator.name();
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name,
  } satisfies IRedditCommunityAdmin.IJoin;
  // 3. Register admin account using utility function
  const response = await authorize_admin_join(adminConnection, { body });
  typia.assert(response);
  // 4. Validate response contains display_name (main business logic test)
  TestValidator.equals(
    "display_name in response matches input",
    response.display_name,
    display_name,
  );
  // 5. Validate display_name is not null
  TestValidator.predicate(
    "display_name is not null",
    response.display_name !== null,
  );
  // 6. Validate email in response matches input
  TestValidator.equals(
    "email in response matches input",
    response.email,
    body.email,
  );
  // 7. Validate admin is active
  TestValidator.predicate("is_active is true", response.is_active === true);
  // 8. Validate created_at and updated_at are present (type validation via typia.assert)
  TestValidator.predicate(
    "created_at is set",
    response.created_at !== undefined && response.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is set",
    response.updated_at !== undefined && response.updated_at !== null,
  );
  // 9. Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    response.deleted_at,
    null,
  );
  // 10. Validate token contains access and refresh tokens
  TestValidator.predicate(
    "access token is present",
    response.token.access !== null,
  );
  TestValidator.predicate(
    "refresh token is present",
    response.token.refresh !== null,
  );
  // 11. Validate token expiration timestamps are present
  TestValidator.predicate(
    "expired_at is set",
    response.token.expired_at !== undefined &&
      response.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    response.token.refreshable_until !== undefined &&
      response.token.refreshable_until !== null,
  );
}