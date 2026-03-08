import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_requests_create } from "../../../generate/generate_random_shopping_mall_seller_requests_create";
import { prepare_random_shopping_mall_administrator_session } from "../../../prepare/prepare_random_shopping_mall_administrator_session";

export async function test_api_seller_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Register a seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Submit administrator request as authenticated seller
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const adminRequest =
    await generate_random_shopping_mall_seller_requests_create(
      sellerConnection,
      { body: { reason } },
    );
  typia.assert(adminRequest);
  // 3. Validate the response - verify session is linked to the authenticated seller
  TestValidator.equals(
    "administrator email matches seller",
    adminRequest.administrator.email,
    seller.email,
  );
  TestValidator.predicate(
    "session has valid UUID",
    adminRequest.id.length === 36,
  );
  TestValidator.predicate(
    "session has created timestamp",
    adminRequest.created_at.length > 0,
  );
}
