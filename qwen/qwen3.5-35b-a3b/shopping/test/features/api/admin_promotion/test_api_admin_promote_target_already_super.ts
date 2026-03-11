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

export async function test_api_admin_promote_target_already_super(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create two super administrator accounts
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdmin123!",
      href: "http://localhost/admin/join",
      referrer: "http://localhost/",
    },
  });
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdmin123!",
      href: "http://localhost/admin/join",
      referrer: "http://localhost/",
    },
  });
  typia.assert(admin2);
  // Validate error response: Promotion attempt with 409 Conflict
  await TestValidator.httpError(
    "promotion of already-super admin should return 409",
    409,
    async () => {
      await api.functional.ecommerceMall.admin.admins.promote(
        admin1Connection,
        {
          adminId: admin2.id,
          body: {
            reason: "Testing edge case: target already super",
          },
        },
      );
    },
  );
}
