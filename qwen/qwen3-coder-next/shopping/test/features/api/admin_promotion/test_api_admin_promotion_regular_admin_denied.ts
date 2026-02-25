import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promotion_regular_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first regular administrator (the one who will attempt promotion)
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await api.functional.shoppingMall.auth.admin.join(
    adminConnection1,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234!@#$",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin1);
  // Create second regular administrator (the one to be promoted)
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await api.functional.shoppingMall.auth.admin.join(
    adminConnection2,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234!@#$",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin2);
  // 2. Authenticate first administrator
  const admin1Auth = await authorize_admin_login(adminConnection1, {
    body: {
      email: (admin1.email ?? "") satisfies string as string,
      password: "1234!@#$",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(admin1Auth);
  // 3. First administrator attempts to promote second administrator (should fail)
  await TestValidator.error(
    "regular admin cannot promote another admin",
    async () => {
      await api.functional.shoppingMall.admin.administrators.promote(
        adminConnection1,
        {
          adminId: admin2.id,
          body: {
            reason: "Testing promotion denial",
          } satisfies IShoppingMallAdmin.IPromote,
        },
      );
    },
  );
}