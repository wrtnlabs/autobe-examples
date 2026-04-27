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

export async function test_api_customer_sessions_filter_by_ip_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer with a specific IP to create a session
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      ip: "192.168.1.100",
    },
  });
  typia.assert(joined);
  // 2. Search sessions by partial IP match — should find the session from registration
  const matched = await api.functional.eCommerceMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        search: "192.168",
      } satisfies IECommerceMallSession.IRequest,
    },
  );
  typia.assert(matched);
  TestValidator.predicate(
    "sessions found by IP partial match",
    matched.data.length > 0,
  );
  for (const session of matched.data) {
    TestValidator.predicate(
      `session IP "${session.ip}" contains search term "192.168"`,
      session.ip.includes("192.168"),
    );
  }
  // 3. Search with non-matching IP — should return empty results
  const empty = await api.functional.eCommerceMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        search: "0.0.0.0",
      } satisfies IECommerceMallSession.IRequest,
    },
  );
  typia.assert(empty);
  TestValidator.equals(
    "no sessions found for non-matching IP",
    empty.data.length,
    0,
  );
  TestValidator.equals(
    "records count is zero for non-matching IP",
    empty.pagination.records,
    0,
  );
}
