import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_include_expired_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Register a customer account — this creates an initial active session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Call sessions listing without include_expired (defaults to false)
  // Should return only active (non-expired) sessions
  const activeOnly = await api.functional.eCommerceMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IECommerceMallSession.IRequest,
    },
  );
  typia.assert(activeOnly);
  // Call sessions listing with include_expired=true
  // Should return both active and expired sessions
  const withExpired =
    await api.functional.eCommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          include_expired: true,
        } satisfies IECommerceMallSession.IRequest,
      },
    );
  typia.assert(withExpired);
  // Including expired sessions is a superset — should have >= records
  TestValidator.predicate(
    "include_expired returns at least as many records as default",
    withExpired.pagination.records >= activeOnly.pagination.records,
  );
}
