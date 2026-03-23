import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_job_queue_deletion_by_non_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Login as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminConnection.headers?.Authorization
        ? typia.random<string & tags.Format<"email">>()
        : typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinEmail = typia.assert<
    string & tags.MinLength<1> & tags.Format<"email">
  >(typia.random<string & tags.Format<"email">>());
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerJoinEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 4. Login as customer
  await authorize_customer_login(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 5. Attempt to delete job queue using customer connection
  const jobQueueId = typia.random<string & tags.Format<"uuid">>();
  // 6. Verify 403 Forbidden response
  try {
    await api.functional.ecommerceMall.admin.job_queues.erase(
      customerConnection,
      {
        jobQueueId,
      },
    );
    throw new Error("Expected 403 Forbidden but request succeeded");
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) {
      throw error;
    }
    TestValidator.equals("status is 403 Forbidden", error.status, 403);
  }
}
