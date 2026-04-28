import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_filter_unused_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search unused password reset tokens
  const body = {
    accountType: "customer",
    unused: true,
  } satisfies IEcommercePlatformCustomerPasswordReset.IRequest;
  const output: IPageIEcommercePlatformCustomerPasswordReset.ISummary =
    await api.functional.ecommercePlatform.customer.password_resets.index(
      customerConnection,
      { body },
    );
  typia.assert(output);
  // 3. Validate pagination metadata exists
  typia.assert(output.pagination);
  // 4. Verify all returned tokens have "unused" status
  const hasConsumedToken = ArrayUtil.has(
    output.data,
    (reset) => reset.status !== "unused",
  );
  TestValidator.predicate(
    "all returned tokens should be unused when filtering with unused=true",
    hasConsumedToken === false,
  );
}
