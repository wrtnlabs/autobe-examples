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

export async function test_api_customer_sessions_list_active_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer — creates an initial session record
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/join`,
      referrer: `https://example.com/`,
    } satisfies IECommerceMallCustomer.IJoin,
  });
  // 2. List sessions with default pagination — no filters
  const page = await api.functional.eCommerceMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IECommerceMallSession.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has at least one session record",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "at least one page exists",
    page.pagination.pages >= 1,
  );
  // 4. Validate session data
  TestValidator.predicate("session data is not empty", page.data.length >= 1);
  // 5. Validate the current session is present and has isCurrent=true
  const currentSession = page.data.find((s) => s.isCurrent);
  TestValidator.predicate(
    "current session exists with isCurrent flag",
    currentSession !== undefined,
  );
  // 6. Validate all sessions have required fields and none are expired
  for (const session of page.data) {
    TestValidator.predicate(
      `session ${session.id} has ip`,
      typeof session.ip === "string",
    );
    TestValidator.predicate(
      `session ${session.id} has href`,
      typeof session.href === "string",
    );
    TestValidator.predicate(
      `session ${session.id} has referrer`,
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      `session ${session.id} has created_at`,
      typeof session.created_at === "string",
    );
    TestValidator.predicate(
      `session ${session.id} has expired_at`,
      typeof session.expired_at === "string",
    );
    TestValidator.predicate(
      `session ${session.id} is not expired`,
      new Date(session.expired_at).getTime() > Date.now(),
    );
  }
}
