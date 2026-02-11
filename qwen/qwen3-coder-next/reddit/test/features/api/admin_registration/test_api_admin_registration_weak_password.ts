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

export async function test_api_admin_registration_weak_password(
  connection: api.IConnection,
): Promise<void> {
  // Prepare weak password (less than 8 characters)
  const weakPassword = "short"; // Only 5 characters, violates tags.MinLength<8>
  // Attempt to register admin with weak password
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: weakPassword,
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  // Expected: API should reject weak password with validation error (400 Bad Request)
  await TestValidator.httpError(
    "weak password should be rejected with 400",
    400,
    async () => {
      await api.functional.redditPlatform.auth.admin.join(connection, { body });
    },
  );
}
