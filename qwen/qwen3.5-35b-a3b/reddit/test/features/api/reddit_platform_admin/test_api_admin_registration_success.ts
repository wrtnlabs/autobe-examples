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

export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Register admin with valid credentials
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformAdmin.IJoin;
  const output = await authorize_admin_join(adminConnection, { body: input });
  typia.assert(output);
  // 3. Verify response structure
  TestValidator.notEquals("admin id is not null", output.id, null);
  TestValidator.equals("email matches input", output.email, input.email);
  TestValidator.equals(
    "username matches input",
    output.username,
    input.username,
  );
  TestValidator.equals(
    "display_name exists",
    output.display_name.length > 0,
    true,
  );
  TestValidator.equals("is_active is true", output.is_active, true);
  TestValidator.predicate(
    "created_at is valid date-time",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    output.updated_at.length > 0,
  );
  TestValidator.predicate(
    "access token not empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    output.token.refreshable_until.length > 0,
  );
  // 4. Verify optional fields exist in structure
  TestValidator.notEquals("bio can be null", output.bio, null);
  TestValidator.notEquals("avatar_url can be null", output.avatar_url, null);
  // 5. Test business logic: duplicate email rejection
  await TestValidator.error(
    "duplicate email should fail",
    async () =>
      await authorize_admin_join(adminConnection, {
        body: {
          ...input,
          email: input.email,
          username: RandomGenerator.alphaNumeric(8),
        } satisfies IRedditPlatformAdmin.IJoin,
      }),
  );
}