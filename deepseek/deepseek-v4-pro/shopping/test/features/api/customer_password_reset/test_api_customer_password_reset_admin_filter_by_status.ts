import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
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

export async function test_api_customer_password_reset_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Query with token_status "valid"
  const validResult =
    await api.functional.shoppingMall.admin.customers.password_resets.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          token_status: "valid",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(validResult);
  // 4. Query with token_status "expired"
  const expiredResult =
    await api.functional.shoppingMall.admin.customers.password_resets.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          token_status: "expired",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResult);
  // 5. Validate pagination data length consistency
  TestValidator.equals(
    "valid filter records count matches data length",
    validResult.pagination.records,
    validResult.data.length,
  );
  TestValidator.equals(
    "expired filter records count matches data length",
    expiredResult.pagination.records,
    expiredResult.data.length,
  );
}
