import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
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

export async function test_api_administrator_request_applicant_customer_admin_only(
  connection: api.IConnection,
): Promise<void> {
  const applicantConnection: api.IConnection = { host: connection.host };
  const applicantJoin = await authorize_customer_join(applicantConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(applicantJoin);
  const administratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      applicantConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(administratorRequest);
  await TestValidator.httpError(
    "customer session should be forbidden from applicant customer lookup",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.applicant_customers.getByAdministratorrequestid(
        applicantConnection,
        {
          administratorRequestId: administratorRequest.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "unauthenticated base connection should be forbidden from applicant customer lookup",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.applicant_customers.getByAdministratorrequestid(
        connection,
        {
          administratorRequestId: administratorRequest.id,
        },
      );
    },
  );
}
