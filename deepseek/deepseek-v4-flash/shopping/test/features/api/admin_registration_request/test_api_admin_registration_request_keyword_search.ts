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

export async function test_api_admin_registration_request_keyword_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Submit an admin registration request with a distinctive reason containing a keyword
  const keyword = "moderation";
  const reason = `I want to help manage the platform as an administrator because I have extensive ${keyword} experience`;
  const request =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(request);
  // 3. Search with the matching keyword
  const searchResult =
    await api.functional.eCommerceMall.customer.admin_registration_requests.index(
      customerConnection,
      {
        body: {
          search: keyword,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Verify our request is found
  TestValidator.predicate("search result contains our request", () =>
    searchResult.data.some((r) => r.id === request.id),
  );
  // 5. Verify each returned request's reason contains the keyword
  for (const r of searchResult.data) {
    TestValidator.predicate("reason contains keyword", () =>
      r.reason.toLowerCase().includes(keyword.toLowerCase()),
    );
  }
  // 6. Search with a non-matching keyword should return empty results
  const emptyResult =
    await api.functional.eCommerceMall.customer.admin_registration_requests.index(
      customerConnection,
      {
        body: {
          search: "nonexistentkeyword123",
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records count",
    emptyResult.pagination.records,
    0,
  );
}
