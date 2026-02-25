import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_unban_non_banned_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>() as string & tags.Format<"email"> & tags.MaxLength<255>,
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create new customer (non-banned)
  const customerEmail = typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>() as string & tags.Format<"email"> & tags.MaxLength<255>;
  const customerJoinResponse =
    await api.functional.shoppingMall.auth.customer.join(adminConnection, {
      body: {
        email: customerEmail,
        password: "1234" satisfies string & tags.Format<"password">,
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerJoinResponse);
  // 3. Unban the non-banned customer
  // Note: This operation should succeed for non-banned customers
  await api.functional.shoppingMall.admin.customers.unbans.unban(
    adminConnection,
    {
      customerId: customerJoinResponse.id,
    },
  );
}
