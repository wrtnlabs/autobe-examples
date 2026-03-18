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

export async function test_api_administrator_request_applicant_customer_wrong_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerLogin = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/owner",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    },
  });
  typia.assert(ownerLogin);
  const wrongConnection: api.IConnection = { host: connection.host };
  const wrongLogin = await authorize_customer_join(wrongConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/wrong",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    },
  });
  typia.assert(wrongLogin);
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      ownerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request);
  const ownerApplicant =
    await api.functional.shoppingMall.administrator.administrator_requests.applicant_customers.create(
      ownerConnection,
      {
        administratorRequestId: request.id,
      },
    );
  typia.assert(ownerApplicant);
  TestValidator.equals(
    "owner applicant linkage should match the owning customer",
    ownerApplicant.customer.id,
    ownerLogin.id,
  );
  TestValidator.equals(
    "owner applicant linkage should match the administrator request",
    ownerApplicant.administratorRequest.id,
    request.id,
  );
  await TestValidator.error(
    "wrong owner must be rejected from applicant-customer creation",
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.applicant_customers.create(
        wrongConnection,
        {
          administratorRequestId: request.id,
        },
      );
    },
  );
  TestValidator.equals(
    "administrator request remains attributable to the original owner",
    ownerApplicant.customer.id,
    ownerLogin.id,
  );
}
