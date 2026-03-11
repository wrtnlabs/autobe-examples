import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_view_rejected_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup - join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Customer setup - join as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Customer submits admin access request
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  const adminRequestId: string = adminRequest.id;
  // 4. Admin rejects the pending request
  const rejectedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.review(
      adminConnection,
      {
        requestId: adminRequestId,
        body: {
          action: "reject",
        } satisfies IEcommerceMallAdminRequestRequest.IReview,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Admin retrieves the rejected customer's request details
  const customerDetail =
    await api.functional.ecommerceMall.admin.admin_requests.customer_request.at(
      adminConnection,
      {
        adminRequestId: adminRequestId,
      },
    );
  typia.assert(customerDetail);
  // 6. Validation
  TestValidator.equals(
    "request status is rejected",
    customerDetail.requestStatus,
    "rejected",
  );
  TestValidator.equals("request id matches", customerDetail.id, adminRequestId);
  TestValidator.equals(
    "reason matches",
    customerDetail.reason,
    adminRequest.reason,
  );
  TestValidator.notEquals("customer info exists", customerDetail.customer, null);
  TestValidator.equals(
    "customer email matches",
    customerDetail.customer.email,
    customer.email,
  );
  TestValidator.notEquals("createdAt exists", customerDetail.createdAt, null);
  TestValidator.notEquals("updatedAt exists", customerDetail.updatedAt, null);
  TestValidator.equals("deletedAt is null", customerDetail.deletedAt, null);
  // Validate createdAt is before updatedAt
  TestValidator.predicate(
    "createdAt is before updatedAt",
    new Date(customerDetail.createdAt).getTime() <
      new Date(customerDetail.updatedAt).getTime(),
  );
}