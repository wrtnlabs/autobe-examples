import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_applicant_seller_access_and_soft_deleted_visibility(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  const administratorRequest =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(administratorRequest);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuthorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorAuthorized);
  await TestValidator.httpError(
    "seller cannot access administrator applicant-seller link",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.applicant_sellers.getByAdministratorrequestidAndAdministratorrequestapplicantsellerid(
        sellerConnection,
        {
          administratorRequestId: administratorRequest.id,
          administratorRequestApplicantSellerId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "inactive or soft-deleted applicant-seller link is unavailable",
    [404, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.applicant_sellers.getByAdministratorrequestidAndAdministratorrequestapplicantsellerid(
        administratorConnection,
        {
          administratorRequestId: administratorRequest.id,
          administratorRequestApplicantSellerId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
