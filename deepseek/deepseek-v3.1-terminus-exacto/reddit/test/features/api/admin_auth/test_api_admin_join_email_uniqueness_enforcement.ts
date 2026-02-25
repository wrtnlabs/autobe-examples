import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_email_uniqueness_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin connection and register initial account
  const adminConnection1: api.IConnection = { host: connection.host };
  const email = typia.random<string & typia.tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // Register first admin account successfully
  const firstAdmin = await authorize_admin_join(adminConnection1, {
    body: {
      email,
      password,
      display_name: displayName,
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // Create second admin connection for duplicate registration attempt
  const adminConnection2: api.IConnection = { host: connection.host };
  // Attempt to register second admin with same email - should fail
  await TestValidator.error("duplicate email registration", async () => {
    await authorize_admin_join(adminConnection2, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        permissions_level: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  });
}
