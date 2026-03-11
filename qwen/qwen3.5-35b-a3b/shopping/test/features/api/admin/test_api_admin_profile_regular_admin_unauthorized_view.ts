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

export async function test_api_admin_profile_regular_admin_unauthorized_view(
  connection: api.IConnection,
): Promise<void> {
  // Create first regular administrator (requester)
  const adminJoin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminJoin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin1);
  // Create second regular administrator (target)
  const adminJoin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminJoin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2);
  // Attempt to view second admin's profile with first admin's connection
  // This should fail with 403 Forbidden because regular admin can only view own profile
  await TestValidator.httpError(
    "regular admin cannot view another admin's profile",
    403,
    async () => {
      // admin1Connection.headers was updated by authorize_admin_join with the token
      return await api.functional.ecommerceMall.admin.admins.at(
        adminJoin1Connection,
        {
          adminId: admin2.id,
        },
      );
    },
  );
}