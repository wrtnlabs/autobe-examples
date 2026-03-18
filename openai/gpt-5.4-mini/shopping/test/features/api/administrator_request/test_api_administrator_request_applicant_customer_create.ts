import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallAdministratorRequestApplicantCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_applicant_customer_create(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/signup",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const loginCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(loginCustomerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      loginCustomerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(request);
  const applicant =
    await api.functional.shoppingMall.administrator.administrator_requests.applicant_customers.create(
      loginCustomerConnection,
      {
        administratorRequestId: request.id,
      },
    );
  typia.assert(applicant);
  TestValidator.equals(
    "administrator request id matches",
    applicant.administratorRequest.id,
    request.id,
  );
  TestValidator.equals(
    "administrator request reason preserved",
    applicant.administratorRequest.reason,
    request.reason,
  );
  TestValidator.equals(
    "administrator request status preserved",
    applicant.administratorRequest.status,
    request.status,
  );
  TestValidator.equals(
    "customer id matches applicant",
    applicant.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches applicant",
    applicant.customer.email,
    customerEmail,
  );
  TestValidator.predicate(
    "created at is populated",
    applicant.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at is populated",
    applicant.updated_at.length > 0,
  );
  TestValidator.equals("deleted at is null", applicant.deleted_at, null);
}
