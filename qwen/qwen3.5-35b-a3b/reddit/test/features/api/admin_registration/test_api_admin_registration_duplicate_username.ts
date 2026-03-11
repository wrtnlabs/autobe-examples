import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // Generate random credentials for first admin registration
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = RandomGenerator.alphaNumeric(16);
  const firstPassword = RandomGenerator.alphaNumeric(16);
  const firstDisplayName = RandomGenerator.name();
  // Step 1: Create first admin account successfully
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdminResponse = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: firstEmail,
      username: firstUsername,
      password: firstPassword,
      display_name: firstDisplayName,
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(firstAdminResponse);
  // Validate first admin registration data
  TestValidator.equals(
    "first admin username",
    firstAdminResponse.username,
    firstUsername,
  );
  TestValidator.equals(
    "first admin email",
    firstAdminResponse.email,
    firstEmail,
  );
  // Step 2: Attempt to register second admin with same username (different email)
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondPassword = RandomGenerator.alphaNumeric(16);
  const secondDisplayName = RandomGenerator.name();
  // The duplicate username registration should fail
  await TestValidator.error("duplicate username rejection", async () => {
    const secondAdminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(secondAdminConnection, {
      body: {
        email: secondEmail,
        username: firstUsername, // Same username as first admin
        password: secondPassword,
        display_name: secondDisplayName,
        bio: RandomGenerator.paragraph(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformAdmin.IJoin,
    });
  });
  // Step 3: Verify data integrity - first admin account still intact
  TestValidator.equals(
    "first admin data preserved",
    firstAdminResponse.username,
    firstUsername,
  );
  TestValidator.equals(
    "first admin email preserved",
    firstAdminResponse.email,
    firstEmail,
  );
}
