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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { generate_random_e_commerce_mall_seller_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_seller_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_super_administrator_filter_requests_by_requester_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  // 2. Customer submits an admin registration request
  const customerRequest =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {},
    );
  typia.assert(customerRequest);
  // 3. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 4. Seller submits an admin registration request
  const sellerRequest =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(sellerRequest);
  // 5. Create a super administrator account (promote an existing regular admin)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuthorized);
  // 6. Query with requester_type = 'customer'
  const customerFilteredResult =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.index(
      superAdminConnection,
      {
        body: {
          requester_type: "customer",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(customerFilteredResult);
  TestValidator.predicate(
    "customer filter returns only customer requests",
    () =>
      customerFilteredResult.data.length >= 1 &&
      customerFilteredResult.data.every(
        (item) => item.requester_type === "customer",
      ),
  );
  // Verify polymorphic requester resolution for customer
  for (const item of customerFilteredResult.data) {
    const requester = item.requester as IECommerceMallCustomer.ISummary;
    TestValidator.predicate(
      "customer requester has id",
      () => typeof requester.id === "string",
    );
    TestValidator.predicate(
      "customer requester has email",
      () => typeof requester.email === "string",
    );
    TestValidator.predicate(
      "customer requester has profile",
      () => requester.profile !== null,
    );
  }
  // 7. Query with requester_type = 'seller'
  const sellerFilteredResult =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.index(
      superAdminConnection,
      {
        body: {
          requester_type: "seller",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(sellerFilteredResult);
  TestValidator.predicate(
    "seller filter returns only seller requests",
    () =>
      sellerFilteredResult.data.length >= 1 &&
      sellerFilteredResult.data.every(
        (item) => item.requester_type === "seller",
      ),
  );
  // Verify polymorphic requester resolution for seller
  for (const item of sellerFilteredResult.data) {
    const requester = item.requester as IECommerceMallSeller.ISummary;
    TestValidator.predicate(
      "seller requester has id",
      () => typeof requester.id === "string",
    );
    TestValidator.predicate(
      "seller requester has email",
      () => typeof requester.email === "string",
    );
    TestValidator.predicate(
      "seller requester has approval_status",
      () => typeof requester.approval_status === "string",
    );
    TestValidator.predicate(
      "seller requester has profile with shop_name",
      () =>
        requester.profile !== null &&
        typeof requester.profile.shop_name === "string",
    );
  }
}
