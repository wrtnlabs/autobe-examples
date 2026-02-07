import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_sellers_filter_by_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secret123",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Filter sellers by status pending
  const sellers = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(sellers);
  // 3. Validate the response contains only pending accounts
  TestValidator.predicate(
    "Seller data should not be empty",
    sellers.data.length > 0,
  );
  // Check each seller has required fields
  for (const seller of sellers.data) {
    TestValidator.equals(
      "Seller status should be pending",
      seller.status,
      "pending",
    );
    TestValidator.predicate("Seller has email", !!seller.email);
    TestValidator.predicate("Seller has shopName", !!seller.shopName);
    TestValidator.predicate("Seller has lastUpdate", !!seller.lastUpdate);
  }
}