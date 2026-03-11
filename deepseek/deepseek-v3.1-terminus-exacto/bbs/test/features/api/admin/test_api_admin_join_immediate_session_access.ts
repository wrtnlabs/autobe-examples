import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_immediate_session_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection object for the admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Register a new administrator using the utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Validate business logic: new administrators should have "regular" grade
  TestValidator.equals(
    "new admin should have regular grade",
    admin.admin_grade,
    "regular",
  );
  // Verify that the connection headers were updated with the authorization token
  TestValidator.predicate(
    "connection headers should contain authorization",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header should match token access",
    adminConnection.headers?.Authorization,
    `Bearer ${admin.token.access}`,
  );
  // The registration process automatically establishes a session
  // The connection is now ready for administrator-only operations
  // This validates the "immediate session access" requirement
}
