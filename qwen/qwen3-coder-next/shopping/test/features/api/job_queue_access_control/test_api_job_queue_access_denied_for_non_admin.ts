import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_job_queue_access_denied_for_non_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as customer (non-admin)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1>>(typia.random<string & tags.Format<"email">>()),
      password: "12345678",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerConnection.headers?.["Authorization"]
        ? "test@example.com"
        : typia.assert<string & tags.Format<"email"> & tags.MinLength<1>>(typia.random<string & tags.Format<"email">>()),
      password: "12345678",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 2. Attempt to access job queue endpoint as non-admin customer
  const jobQueueId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-admin cannot access job queue", async () => {
    await api.functional.ecommerceMall.admin.job_queues.at(customerConnection, {
      jobQueueId,
    });
  });
}