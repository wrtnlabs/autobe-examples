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

export async function test_api_admin_registration_request_filter_by_requester_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Customer submits an admin registration request
  const registrationRequest =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {},
    );
  typia.assert(registrationRequest);
  // 3. Filter by requester_type = 'customer'
  const customerFilteredPage: IPageIECommerceMallAdminRegistrationRequest.ISummary =
    await api.functional.eCommerceMall.customer.admin_registration_requests.index(
      customerConnection,
      {
        body: {
          requester_type: "customer",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(customerFilteredPage);
  // 4. Validate the response contains the customer's own request
  TestValidator.equals(
    "requester_type is 'customer' on all returned items",
    customerFilteredPage.data.every(
      (item: IECommerceMallAdminRegistrationRequest.ISummary) =>
        item.requester_type === "customer",
    ),
    true,
  );
  const foundRequest = customerFilteredPage.data.find(
    (item: IECommerceMallAdminRegistrationRequest.ISummary) =>
      item.id === registrationRequest.id,
  );
  TestValidator.predicate(
    "customer's own registration request is in the result set",
    () => foundRequest !== undefined,
  );
  // 5. Validate requester is resolved as IECommerceMallCustomer.ISummary
  typia.assert(foundRequest!);
  TestValidator.equals(
    "requester_type matches the filter",
    foundRequest!.requester_type,
    "customer",
  );
  // The requester should be a customer summary (IECommerceMallCustomer.ISummary)
  const requester = foundRequest!.requester as IECommerceMallCustomer.ISummary;
  typia.assert(requester);
  TestValidator.predicate(
    "requester has an id",
    () => requester.id !== undefined,
  );
  TestValidator.predicate(
    "requester has an email",
    () => requester.email !== undefined,
  );
  TestValidator.predicate(
    "requester has a profile",
    () => requester.profile !== null,
  );
  // 6. Validate pagination metadata
  const pagination = customerFilteredPage.pagination;
  TestValidator.predicate(
    "pagination has current page",
    () => pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", () => pagination.limit >= 1);
  TestValidator.predicate(
    "pagination has records count",
    () => pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => pagination.pages >= 1,
  );
  // 7. Filter by requester_type = 'seller' — should return empty since actor is customer
  const sellerFilteredPage: IPageIECommerceMallAdminRegistrationRequest.ISummary =
    await api.functional.eCommerceMall.customer.admin_registration_requests.index(
      customerConnection,
      {
        body: {
          requester_type: "seller",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(sellerFilteredPage);
  TestValidator.equals(
    "filtering by seller requester_type returns empty data array",
    sellerFilteredPage.data.length,
    0,
  );
}
