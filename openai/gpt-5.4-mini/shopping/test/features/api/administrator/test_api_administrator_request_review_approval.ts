import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallAdministratorRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_reviews_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_reviews_create";
import { prepare_random_shopping_mall_administrator_request_review } from "../../../prepare/prepare_random_shopping_mall_administrator_request_review";

export async function test_api_administrator_request_review_approval(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  const review =
    await api.functional.shoppingMall.administrator.administrator_requests.reviews.create(
      superAdministratorConnection,
      {
        administratorRequestId,
        body: {
          decision: "approve",
        } satisfies IShoppingMallAdministratorRequestReview.ICreate,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review references the requested administrator application",
    review.shoppingMallAdministratorRequest.id,
    administratorRequestId,
  );
  TestValidator.equals(
    "review decision is approval",
    review.decision,
    "approve",
  );
  TestValidator.equals(
    "reviewer is the authenticated administrator",
    review.shoppingMallAdministrator.id,
    authorized.id,
  );
}
