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

export async function test_api_seller_sales_review_votes_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // This test covers the scenario where a seller who owns a sale fetches review votes.
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      shopName: "SellerShop",
      shopDescription: "Test Seller Shop",
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Seller creates a new sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: `Test Product ${RandomGenerator.alphaNumeric(8)}`,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"double"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(sale);
  // 3. Retrieve review votes for the sale with no filter (empty request body)
  const reviewVotesResponse =
    await api.functional.shoppingMall.seller.sales.review_votes.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: {
          // No filters, use default pagination
          actor_type: undefined,
          voter_id: undefined,
          createdAtGte: null,
          createdAtLte: null,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleReviewVote.IRequest,
      },
    );
  typia.assert(reviewVotesResponse);
  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    reviewVotesResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reviewVotesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    reviewVotesResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    reviewVotesResponse.pagination.records >= 0,
  );
  // Validate data elements
  for (const vote of reviewVotesResponse.data) {
    typia.assert(vote);
    TestValidator.predicate(
      "vote id valid uuid",
      /^[0-9a-f-]{36}$/i.test(vote.id),
    );
    TestValidator.predicate(
      "actorType is either 'customer' or 'seller'",
      vote.actorType === "customer" || vote.actorType === "seller",
    );
    // Validate voter and review summaries exist
    TestValidator.predicate(
      "vote has voter info",
      vote.voter !== null && typeof vote.voter === "object",
    );
    TestValidator.predicate(
      "vote has review info",
      vote.review !== null && typeof vote.review === "object",
    );
  }
}
