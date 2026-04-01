import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_own_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    page: 1,
    limit: 20,
    sort: "-createdAt",
  } satisfies IMallPlatformCustomerSession.IRequest;
  const first = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  const second = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "pagination current",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "repeat pagination current",
    second.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "repeat pagination limit",
    second.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "deterministic pagination records",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "deterministic pagination pages",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals("deterministic data", first.data, second.data);
  for (const session of first.data) {
    TestValidator.equals(
      "session owner id",
      session.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      "session owner email",
      session.customer.email,
      authorized.email,
    );
    TestValidator.equals(
      "session owner status",
      session.customer.status,
      authorized.status,
    );
    TestValidator.predicate("session id present", session.id.length > 0);
    TestValidator.predicate("session ip present", session.ip.length > 0);
    TestValidator.predicate("session href present", session.href.length > 0);
    TestValidator.predicate(
      "session referrer present",
      session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session createdAt present",
      session.createdAt.length > 0,
    );
    TestValidator.predicate(
      "session expiredAt present",
      session.expiredAt.length > 0,
    );
  }
  TestValidator.predicate("response exposes only read-only summaries", () =>
    first.data.every(
      (session) =>
        !("access" in session) &&
        !("refresh" in session) &&
        !("secret" in session),
    ),
  );
}
