import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a registered member first (to establish member actor and have some data in system)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Try to login with a non-existent email (completely different from registered one)
  const nonExistentEmail = `nonexistent.${Date.now()}.${RandomGenerator.alphaNumeric(8)}@notregistered.test`;
  // Store error message from non-existent email login attempt
  let nonExistentEmailError: string | null = null;
  try {
    await api.functional.erpHrm.auth.member.login(connection, {
      body: {
        email: nonExistentEmail satisfies string & tags.Format<"email">,
        password: "anypassword123",
        href: "http://localhost:3000/login" satisfies string &
          tags.Format<"uri">,
        referrer: "http://localhost:3000/" satisfies string &
          tags.Format<"uri">,
      },
    });
  } catch (exp) {
    nonExistentEmailError = (exp as any).response?.data?.message ?? (exp as Error).message;
  }
  TestValidator.predicate(
    "error returned for unregistered email",
    nonExistentEmailError !== null,
  );
  // 3. Try to login with valid email but wrong password (for comparison)
  let wrongPasswordError: string | null = null;
  try {
    await TestValidator.error(
      "wrong password login",
      async () => {
        await api.functional.erpHrm.auth.member.login(connection, {
          body: {
            email: "admin@sample.com" satisfies string & tags.Format<"email">,
            password: "wrongpassword123",
            href: "http://localhost:3000/login" satisfies string &
              tags.Format<"uri">,
            referrer: "http://localhost:3000/" satisfies string &
              tags.Format<"uri">,
          },
        });
      },
    );
  } catch (exp) {
    wrongPasswordError = (exp as any).response?.data?.message ?? (exp as Error).message;
  }
  // 4. Verify the same error message is returned (prevents email enumeration)
  TestValidator.equals(
    "error message is same for unregistered email vs wrong password",
    nonExistentEmailError,
    wrongPasswordError,
  );
}