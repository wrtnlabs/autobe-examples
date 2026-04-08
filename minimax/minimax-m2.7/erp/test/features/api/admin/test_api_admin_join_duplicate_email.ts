import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account with unique email
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: uniqueEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstAdmin);
  // 2. Attempt to create another admin with the same email
  const duplicateConnection: api.IConnection = { host: connection.host };
  // 3. Validate that 409 Conflict error is returned for duplicate email
  await TestValidator.httpError(
    "duplicate email should return 409",
    409,
    async () => {
      await api.functional.erpHrm.auth.admin.join(duplicateConnection, {
        body: {
          email: uniqueEmail,
          password: RandomGenerator.alphaNumeric(16),
          displayName: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
