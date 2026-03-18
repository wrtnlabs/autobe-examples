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

export async function test_api_member_login_nonexistent_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Generate guaranteed non-existent email using UUID to ensure uniqueness
  const nonExistentEmail = `nonexistent_${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  // Attempt login with non-existent email and verify 401 response
  // This tests the security requirement that failed logins should not
  // distinguish between non-existent email and wrong password
  await TestValidator.httpError(
    "non-existent email login should return 401 without revealing email status",
    401,
    async () => {
      await api.functional.erpHrm.auth.member.login(testConnection, {
        body: {
          email: nonExistentEmail,
          password: "Password123!",
        } satisfies IErpHrmMember.ILogin,
      });
    },
  );
}
