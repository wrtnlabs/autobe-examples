import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
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

export async function test_api_administrator_request_applicant_seller_unique_link(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const created =
    await generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create(
      adminConnection,
      {
        params: {
          administratorRequestId,
        },
        body: {
          shopping_mall_seller_id: sellerId,
        } satisfies IShoppingMallAdministratorRequestApplicantSeller.ICreate,
      },
    );
  typia.assert(created);
  const retrieved =
    await api.functional.shoppingMall.administrator.administrator_requests.applicant_sellers.patchByAdministratorrequestid(
      adminConnection,
      {
        administratorRequestId,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "administrator request id should match the canonical applicant-seller link",
    retrieved.shopping_mall_administrator_request_id,
    created.shopping_mall_administrator_request_id,
  );
  TestValidator.equals(
    "seller id should match the canonical applicant-seller link",
    retrieved.shopping_mall_seller_id,
    created.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "link id should remain the same for the unique association",
    retrieved.id,
    created.id,
  );
  TestValidator.equals(
    "created timestamp should be preserved",
    retrieved.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated timestamp should be preserved",
    retrieved.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp should be preserved",
    retrieved.deleted_at,
    created.deleted_at,
  );
}
