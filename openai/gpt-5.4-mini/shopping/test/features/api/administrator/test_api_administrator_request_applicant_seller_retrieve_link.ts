import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create";
import { prepare_random_shopping_mall_administrator_request_applicant_seller } from "../../../prepare/prepare_random_shopping_mall_administrator_request_applicant_seller";

export async function test_api_administrator_request_applicant_seller_retrieve_link(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  const sellerApplicantId = typia.random<string & tags.Format<"uuid">>();
  const created =
    await generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create(
      administratorConnection,
      {
        params: { administratorRequestId },
        body: {
          shopping_mall_seller_id: sellerApplicantId,
        } satisfies IShoppingMallAdministratorRequestApplicantSeller.ICreate,
      },
    );
  typia.assert(created);
  const gotten =
    await api.functional.shoppingMall.administrator.administrator_requests.applicant_sellers.getByAdministratorrequestidAndAdministratorrequestapplicantsellerid(
      administratorConnection,
      {
        administratorRequestId: created.shopping_mall_administrator_request_id,
        administratorRequestApplicantSellerId: created.id,
      },
    );
  typia.assert(gotten);
  TestValidator.equals(
    "retrieved applicant link should match created record",
    gotten,
    created,
  );
  TestValidator.equals(
    "administrator request id should match",
    gotten.shopping_mall_administrator_request_id,
    created.shopping_mall_administrator_request_id,
  );
  TestValidator.equals(
    "seller applicant id should match",
    gotten.shopping_mall_seller_id,
    created.shopping_mall_seller_id,
  );
  TestValidator.equals("link id should match", gotten.id, created.id);
}
