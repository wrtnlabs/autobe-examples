import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
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
import { generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";
import { prepare_random_shopping_mall_administrator_request_applicant_seller } from "../../../prepare/prepare_random_shopping_mall_administrator_request_applicant_seller";

export async function test_api_administrator_request_applicant_seller_pending_state_required(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const administratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(administratorRequest);
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const applicantLink =
    await generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create(
      administratorConnection,
      {
        params: {
          administratorRequestId: administratorRequest.id,
        },
        body: {
          shopping_mall_seller_id: sellerId,
        },
      },
    );
  typia.assert(applicantLink);
  TestValidator.equals(
    "applicant link uses the target administrator request",
    applicantLink.shopping_mall_administrator_request_id,
    administratorRequest.id,
  );
  TestValidator.equals(
    "applicant link uses the requested seller",
    applicantLink.shopping_mall_seller_id,
    sellerId,
  );
  await TestValidator.error(
    "pending-state applicant link creation is not allowed twice for the same request",
    async () => {
      await generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create(
        administratorConnection,
        {
          params: {
            administratorRequestId: administratorRequest.id,
          },
          body: {
            shopping_mall_seller_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
}
