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

export async function test_api_administrator_request_review_rejection_reason(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    },
  });
  typia.assert(customerAuth);
  const administratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(administratorRequest);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuth = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(administratorAuth);
  const rejectionReason = RandomGenerator.paragraph({ sentences: 4 });
  const reviewDecision = "rejected";
  const review =
    await api.functional.shoppingMall.administrator.administrator_requests.reviews.process(
      administratorConnection,
      {
        administratorRequestId: administratorRequest.id,
        body: {
          decision: reviewDecision,
          rejectedReason: rejectionReason,
        } satisfies IShoppingMallAdministratorRequestReview.IRequest,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "reviewed request id",
    review.shoppingMallAdministratorRequest.id,
    administratorRequest.id,
  );
  TestValidator.equals("review decision", review.decision, reviewDecision);
  TestValidator.equals(
    "review rejection reason stored on request",
    review.shoppingMallAdministratorRequest.rejected_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "request status rejected",
    review.shoppingMallAdministratorRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewer id",
    review.shoppingMallAdministrator.id,
    administratorAuth.id,
  );
  TestValidator.equals(
    "reviewer email",
    review.shoppingMallAdministrator.email,
    administratorAuth.email,
  );
  TestValidator.predicate(
    "review timestamp exists",
    review.created_at.length > 0,
  );
}
