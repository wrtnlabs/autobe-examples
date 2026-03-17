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

export async function test_api_customer_view_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResult);
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerResult);
  // 3. Admin retrieves customer by ID using adminConnection
  const customer = await api.functional.ecommerceMall.admin.customers.at(
    adminConnection,
    {
      customerId: customerResult.id,
    },
  );
  typia.assert(customer);
  // 4. Validate customer record contains expected fields
  // Note: email is not exposed in admin view for security (authentication credentials)
  TestValidator.equals("customer id", customer.id, customerResult.id);
  TestValidator.equals(
    "customer display_name",
    customer.display_name,
    customerResult.display_name,
  );
  TestValidator.equals(
    "customer phone_number",
    customer.phone_number,
    customerResult.phone_number,
  );
  TestValidator.equals(
    "customer status",
    customer.status,
    customerResult.status,
  );
  TestValidator.equals(
    "customer created_at",
    customer.created_at,
    customerResult.created_at,
  );
  TestValidator.equals(
    "customer updated_at",
    customer.updated_at,
    customerResult.updated_at,
  );
  TestValidator.equals(
    "customer deleted_at",
    customer.deleted_at,
    customerResult.deleted_at,
  );
}
