import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful super administrator registration flow.
 * 1. Create a new super admin account with valid email and strong password
 * 2. Validate response includes proper authentication tokens and structure
 */
export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data
  const email = typia.random<string & typia.tags.Format<"email">>();
  const password = "TestP@ssw0rd123!";
  const name = "Super Admin Test";
  // Register new super admin
  const output: IDiscussionBoardSuperAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.superAdmin.join(connection, {
      body: {
        email,
        password,
        name,
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
  // Complete validation of response structure
  typia.assert(output);
  // Verify the token was set in the connection
  if (!connection.headers?.Authorization) {
    throw new Error("Authorization header should be set after join");
  }
  // Verify returned data matches input
  if (output.email !== email) {
    throw new Error("Returned email should match registered email");
  }
}
