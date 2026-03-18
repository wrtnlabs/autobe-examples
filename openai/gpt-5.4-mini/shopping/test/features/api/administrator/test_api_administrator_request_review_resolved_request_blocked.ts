import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallAdministratorRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestReview";
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

export async function test_api_administrator_request_review_resolved_request_blocked(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuthorization = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorAuthorization);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorization = await authorize_customer_join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost",
        referrer: "http://localhost",
        ip: null,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerAuthorization);
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(request);
  const firstReview =
    await api.functional.shoppingMall.administrator.administrator_requests.reviews.process(
      administratorConnection,
      {
        administratorRequestId: request.id,
        body: {
          decision: "approved",
        } satisfies IShoppingMallAdministratorRequestReview.IRequest,
      },
    );
  typia.assert(firstReview);
  TestValidator.equals(
    "reviewed request id should match",
    firstReview.shoppingMallAdministratorRequest.id,
    request.id,
  );
  TestValidator.equals(
    "request should be approved after first review",
    firstReview.shoppingMallAdministratorRequest.status,
    "approved",
  );
  await TestValidator.error(
    "second review for resolved request should be rejected",
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.reviews.process(
        administratorConnection,
        {
          administratorRequestId: request.id,
          body: {
            decision: "rejected",
            rejectedReason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IShoppingMallAdministratorRequestReview.IRequest,
        },
      );
    },
  );
  TestValidator.equals(
    "resolved request status remains approved",
    firstReview.shoppingMallAdministratorRequest.status,
    "approved",
  );
  TestValidator.equals(
    "resolved request id remains unchanged",
    firstReview.shoppingMallAdministratorRequest.id,
    request.id,
  );
}
