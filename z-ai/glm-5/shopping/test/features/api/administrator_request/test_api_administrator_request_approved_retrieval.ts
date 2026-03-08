import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_requests_create } from "../../../generate/generate_random_shopping_mall_customer_requests_create";
import { prepare_random_shopping_mall_administrator_session } from "../../../prepare/prepare_random_shopping_mall_administrator_session";

export async function test_api_administrator_request_approved_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Customer submits administrator request
  const request = await generate_random_shopping_mall_customer_requests_create(
    customerConnection,
    {},
  );
  typia.assert(request);
  // 3. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 4. Super administrator approves the request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.requests.review(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          decision: "approved",
        } satisfies IShoppingMallAdministratorSession.IReview,
      },
    );
  typia.assert(approvedRequest);
  // 5. Super administrator retrieves the approved request
  const retrievedRequest =
    await api.functional.shoppingMall.administrator.requests.at(
      superAdminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate the retrieved request details
  TestValidator.equals("request ID matches", retrievedRequest.id, request.id);
  TestValidator.equals(
    "retrieved ID matches approved ID",
    retrievedRequest.id,
    approvedRequest.id,
  );
  TestValidator.predicate(
    "created_at timestamp present",
    !!retrievedRequest.created_at,
  );
  TestValidator.predicate(
    "expired_at timestamp present",
    !!retrievedRequest.expired_at,
  );
  TestValidator.predicate(
    "administrator info present",
    !!retrievedRequest.administrator,
  );
  TestValidator.predicate("IP address present", !!retrievedRequest.ip);
  TestValidator.predicate("href present", !!retrievedRequest.href);
}
