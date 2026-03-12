import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator registration with required fields only.
 * 1. Create administrator connection from base connection
 * 2. Register new administrator using authorize utility
 * 3. Validate response structure and token presence
 * 4. Verify default grade assignment and account status
 */
export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Register new administrator using utility function
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(administrator);
  // 3. Validate business logic: grade is 'regular' by default
  TestValidator.equals(
    "grade is regular by default",
    administrator.grade,
    "regular",
  );
  // 4. Validate account is active (not deleted)
  TestValidator.equals(
    "account is active (not deleted)",
    administrator.deleted_at,
    null,
  );
  // 5. Validate authorization tokens are present
  TestValidator.predicate(
    "access token is present",
    administrator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    administrator.token.refresh.length > 0,
  );
  // 6. Verify connection was updated with authorization header
  TestValidator.predicate(
    "connection has authorization header",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header uses access token",
    adminConnection.headers?.Authorization,
    administrator.token.access,
  );
}
