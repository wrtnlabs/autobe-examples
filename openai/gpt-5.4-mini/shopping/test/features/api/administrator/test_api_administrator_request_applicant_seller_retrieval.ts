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
import { generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create";
import { prepare_random_shopping_mall_administrator_request_applicant_seller } from "../../../prepare/prepare_random_shopping_mall_administrator_request_applicant_seller";

export async function test_api_administrator_request_applicant_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const linked =
    await generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create(
      administratorConnection,
      {
        params: {
          administratorRequestId: requestId,
        },
        body: {
          shopping_mall_seller_id: seller.id,
        } satisfies IShoppingMallAdministratorRequestApplicantSeller.ICreate,
      },
    );
  typia.assert(linked);
  const output =
    await api.functional.shoppingMall.administrator.administrator_requests.applicant_sellers.patchByAdministratorrequestid(
      administratorConnection,
      {
        administratorRequestId: requestId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "administrator request id should match",
    output.shopping_mall_administrator_request_id,
    linked.shopping_mall_administrator_request_id,
  );
  TestValidator.equals(
    "seller applicant id should match",
    output.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals("link id should match", output.id, linked.id);
  TestValidator.equals(
    "created timestamp should match",
    output.created_at,
    linked.created_at,
  );
  TestValidator.equals(
    "updated timestamp should match",
    output.updated_at,
    linked.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp should match",
    output.deleted_at,
    linked.deleted_at,
  );
}
