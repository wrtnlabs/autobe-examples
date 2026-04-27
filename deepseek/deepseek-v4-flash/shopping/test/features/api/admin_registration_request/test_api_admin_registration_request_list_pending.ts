import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminRegistrationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_admin_registration_request_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Submit an admin registration request with a specific reason
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const registration =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {
        body: {
          reason,
        } satisfies DeepPartial<IECommerceMallAdminRegistrationRequest.ICreate>,
      },
    );
  typia.assert(registration);
  // 3. List pending admin registration requests
  const page =
    await api.functional.eCommerceMall.customer.admin_registration_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(page);
  // 4. Validate pagination structure
  TestValidator.equals("current page >= 1", page.pagination.current >= 1, true);
  TestValidator.equals("limit is set", page.pagination.limit >= 1, true);
  TestValidator.predicate("records >= 0", page.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", page.pagination.pages >= 0);
  // 5. Validate data contains at least one record
  TestValidator.predicate(
    "has at least one pending request",
    page.data.length >= 1,
  );
  // 6. Validate the returned request summary fields
  const record: IECommerceMallAdminRegistrationRequest.ISummary = page.data[0];
  TestValidator.equals(
    "requester_type is customer",
    record.requester_type,
    "customer",
  );
  TestValidator.equals("status is pending", record.status, "pending");
  TestValidator.equals(
    "reason matches submitted reason",
    record.reason,
    reason,
  );
  TestValidator.equals("reviewer is null", record.reviewer, null);
  TestValidator.equals("reviewed_at is null", record.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason is null",
    record.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is a valid string",
    typeof record.created_at === "string",
  );
  // 7. Validate requester is populated with customer summary
  TestValidator.predicate(
    "requester has an id",
    typeof record.requester.id === "string",
  );
  TestValidator.equals(
    "requester email matches",
    record.requester.email,
    customer.email,
  );
}
