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

export async function test_api_administrator_request_review_rejection(
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
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const review =
    await generate_random_shopping_mall_administrator_administrator_requests_reviews_create(
      adminConnection,
      {
        params: {
          administratorRequestId,
        },
        body: {
          decision: "reject",
          rejected_reason: rejectionReason,
        } satisfies IShoppingMallAdministratorRequestReview.ICreate,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review decision should be reject",
    review.decision,
    "reject",
  );
  TestValidator.equals(
    "reviewing administrator should match authenticated administrator",
    review.shoppingMallAdministrator.id,
    authorized.id,
  );
  TestValidator.equals(
    "reviewing administrator email should match authenticated administrator",
    review.shoppingMallAdministrator.email,
    authorized.email,
  );
  TestValidator.equals(
    "reviewed administrator request id should match input",
    review.shoppingMallAdministratorRequest.id,
    administratorRequestId,
  );
  TestValidator.equals(
    "reviewed administrator request rejection reason should be preserved",
    review.shoppingMallAdministratorRequest.rejected_reason,
    rejectionReason,
  );
}
