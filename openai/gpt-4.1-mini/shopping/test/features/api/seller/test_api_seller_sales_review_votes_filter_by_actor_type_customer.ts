import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReviewVote";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sales_review_votes_filter_by_actor_type_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword1234",
      shopName: "Test Seller Shop",
      shopDescription: "A test seller shop description.",
      logoUri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Update sellerConnection header with token
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 2. Create a sale listing by the authorized seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: `Test Sale ${RandomGenerator.alphaNumeric(5)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 1000 + Math.floor(Math.random() * 1000),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies DeepPartial<IShoppingMallSale.ICreate> | undefined,
    },
  );
  typia.assert(sale);
  // 3. Prepare request to fetch review votes filtered by actor_type "customer"
  const request: IShoppingMallSaleReviewVote.IRequest = {
    actor_type: "customer",
    page: 1,
    limit: 10,
  };
  // 4. Fetch review votes for the sale filtered by actor_type "customer"
  const reviewVotes =
    await api.functional.shoppingMall.seller.sales.review_votes.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: request,
      },
    );
  typia.assert(reviewVotes);
  // 5. Validate pagination fields
  TestValidator.predicate(
    "pagination current page is 1",
    reviewVotes.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    reviewVotes.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    reviewVotes.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    reviewVotes.pagination.records >= 0,
  );
  // 6. Validate all review votes have actorType "customer"
  for (const vote of reviewVotes.data) {
    TestValidator.equals(
      "vote actorType is customer",
      vote.actorType,
      "customer",
    );
    typia.assert(vote);
  }
}
