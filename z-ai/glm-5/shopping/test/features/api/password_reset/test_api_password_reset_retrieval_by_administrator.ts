import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator for password reset oversight
  const adminConnection: api.IConnection = { host: connection.host };
  typia.assert(await authorize_administrator_join(adminConnection, {}));
  // 2. Create customer account (password resets are associated with customers)
  const customerConnection: api.IConnection = { host: connection.host };
  typia.assert(await authorize_customer_join(customerConnection, {}));
  // 3. Administrator retrieves password reset record by UUID
  // Note: Password reset creation API not available - using random UUID
  // In production, customer would request password reset first to create record
  const reset =
    await api.functional.shoppingMall.administrator.password_resets.at(
      adminConnection,
      { resetId: typia.random<string & tags.Format<"uuid">>() },
    );
  typia.assert(reset);
}
