import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_registration_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // Create two owner connections for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  // Register first owner with specific username
  const username = "testuser123";
  const firstEmail = "first@test.com";
  const secondEmail = "second@test.com";
  const firstOwner = await authorize_owner_join(adminConnection, {
    body: {
      email: firstEmail,
      password: "SecurePass123!",
      username: username,
      displayName: "First Test Owner",
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(firstOwner);
  // Try to register second owner with the same username (should fail)
  await TestValidator.error("duplicate username rejected", async () => {
    await authorize_owner_join(secondConnection, {
      body: {
        email: secondEmail,
        password: "SecurePass456!",
        username: username,
        displayName: "Second Test Owner",
      } satisfies IRedditCloneOwner.IJoin,
    });
  });
}
