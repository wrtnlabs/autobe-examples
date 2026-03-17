import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection for the login attempt (no pre-existing auth headers)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random email address guaranteed not to be registered on the platform
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  // Attempt to login with a non-existent email - must fail with 401 Unauthorized
  // The system enforces anti-enumeration: same error for unknown email and wrong password
  await TestValidator.httpError(
    "login with non-existent email should return 401 Unauthorized",
    401,
    async () => {
      await authorize_member_login(guestConnection, {
        body: {
          email: nonExistentEmail,
          password: typia.random<string & tags.Format<"password">>(),
        } satisfies ICommunityMember.ILogin,
      });
    },
  );
}
