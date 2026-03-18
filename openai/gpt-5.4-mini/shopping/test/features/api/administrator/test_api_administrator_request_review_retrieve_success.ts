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

export async function test_api_administrator_request_review_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  administratorConnection.headers = {
    ...(administratorConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const administratorRequestId = typia.random<string & tags.Format<"uuid">>();
  const administratorRequestReviewId = typia.random<
    string & tags.Format<"uuid">
  >();
  const review =
    await api.functional.shoppingMall.administrator.administrator_requests.reviews.at(
      administratorConnection,
      {
        administratorRequestId,
        administratorRequestReviewId,
      },
    );
  typia.assert(review);
  const secondReview =
    await api.functional.shoppingMall.administrator.administrator_requests.reviews.at(
      administratorConnection,
      {
        administratorRequestId,
        administratorRequestReviewId,
      },
    );
  typia.assert(secondReview);
  TestValidator.equals(
    "review lookup is stable across repeated retrievals",
    review,
    secondReview,
  );
  TestValidator.equals(
    "review is scoped to the requested administrator request",
    review.shoppingMallAdministratorRequest.id,
    administratorRequestId,
  );
  TestValidator.equals(
    "review record id is preserved",
    review.id,
    secondReview.id,
  );
  TestValidator.predicate(
    "review decision is immutable audit data",
    review.decision.length > 0,
  );
  TestValidator.predicate(
    "review created_at is present",
    review.created_at.length > 0,
  );
  TestValidator.predicate(
    "reviewing administrator summary is present",
    review.shoppingMallAdministrator.id.length > 0 &&
      review.shoppingMallAdministrator.email.length > 0,
  );
  TestValidator.predicate(
    "administrator request summary is present",
    review.shoppingMallAdministratorRequest.reason.length > 0 &&
      review.shoppingMallAdministratorRequest.status.length > 0,
  );
}
