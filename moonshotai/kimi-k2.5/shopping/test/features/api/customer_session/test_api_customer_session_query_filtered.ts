import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallActorType";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
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

export async function test_api_customer_session_query_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create multiple customers to generate sessions for querying
  await ArrayUtil.asyncRepeat(3, async () => {
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  });
  // 3. Query customer sessions with filters using admin connection
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const sessions = await api.functional.ecommerceMall.customer.sessions.index(
    adminConnection,
    {
      body: {
        actorType: "customer",
        isActive: true,
        createdAtFrom: oneHourAgo.toISOString(),
        createdAtTo: oneHourLater.toISOString(),
        limit: 20,
      } satisfies IEcommerceMallCustomerSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    sessions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    sessions.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    sessions.pagination.pages >= 0,
  );
  // 5. Validate sessions are ordered by createdAt descending (newest first)
  if (sessions.data.length > 1) {
    for (let i = 0; i < sessions.data.length - 1; i++) {
      const current = new Date(sessions.data[i].createdAt).getTime();
      const next = new Date(sessions.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `session ${i} createdAt >= session ${i + 1} createdAt`,
        current >= next,
      );
    }
  }
}
