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
 * Test super administrator registration with duplicate email address.
 * Verifies that the system properly detects and rejects registration attempts
 * using an email address that already exists in the system.
 */
export async function test_api_super_admin_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // First registration: Should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_super_admin_join(firstConnection, {
    body: {
      email: duplicateEmail,
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  typia.assert(firstAdmin);
  // Second registration: Should fail due to duplicate email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email registration", async () => {
    await authorize_super_admin_join(secondConnection, {
      body: {
        email: duplicateEmail,
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      },
    });
  });
}
