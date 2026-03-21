import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a non-existent email address that is valid format but won't exist in system
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  // Valid password format for the request
  const validPassword = typia.random<string & tags.Format<"password">>();
  // Attempt to login with non-existent email
  // Should fail with HTTP error and generic message (no email enumeration)
  await TestValidator.httpError(
    "login with non-existent email should fail",
    400,
    async () =>
      await api.functional.ecommerceMall.auth.admin.login(connection, {
        body: {
          email: nonexistentEmail,
          password: validPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.ILogin,
      }),
  );
}
