import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

/**
 * Test that an administrator can retrieve detailed information for a soft-deleted (banned) customer account.
 * 1. Create admin account via join
 * 2. Create customer account via join
 * 3. Ban customer account using admin ban endpoint
 * 4. Call GET /admin/customers/{customerId} with banned customer's UUID
 * 5. Verify deleted_at timestamp is populated (not null)
 * 6. Confirm all other fields remain accessible
 */
export async function test_api_customer_detail_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  const customerEmail = customerAuth.email;
  const customerNickname = customerAuth.nickname;
  const customerPhone = customerAuth.phone_number;
  // 3. Ban the customer account using admin
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customerId,
  });
  // 4. Retrieve the banned customer details via admin endpoint
  const customerDetail = await api.functional.shoppingMall.admin.customers.at(
    adminConnection,
    {
      customerId: customerId,
    },
  );
  typia.assert(customerDetail);
  // 5. Verify soft-deletion state - deleted_at should be populated
  TestValidator.predicate(
    "deleted_at is populated",
    customerDetail.deleted_at !== null,
  );
  // 6. Verify all customer fields remain accessible
  TestValidator.equals("customer id preserved", customerDetail.id, customerId);
  TestValidator.equals("email preserved", customerDetail.email, customerEmail);
  TestValidator.equals(
    "nickname preserved",
    customerDetail.nickname,
    customerNickname,
  );
  TestValidator.equals(
    "phone_number preserved",
    customerDetail.phone_number,
    customerPhone,
  );
  TestValidator.predicate(
    "created_at exists",
    customerDetail.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    customerDetail.updated_at !== null,
  );
}