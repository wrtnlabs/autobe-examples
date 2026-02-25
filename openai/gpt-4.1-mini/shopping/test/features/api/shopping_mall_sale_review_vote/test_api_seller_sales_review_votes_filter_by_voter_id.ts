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

export async function test_api_seller_sales_review_votes_filter_by_voter_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and obtains authorization
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shopName: "Test Shop",
      shopDescription: "Test seller description",
      logoUri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  sellerJoinConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Seller creates a new sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerJoinConnection,
    {},
  );
  typia.assert(sale);
  // 3. Prepare to filter review votes by a specific voterId
  // To do this, we need to gather some review votes data first, so we get all review votes for that sale (if any) without filter
  // Then we pick a voterId from the existing votes or create a UUID and confirm that the filter works as expected
  // Fetch all review votes without filters by issuer
  const allVotesResponse =
    await api.functional.shoppingMall.seller.sales.review_votes.index(
      sellerJoinConnection,
      {
        saleId: sale.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleReviewVote.IRequest,
      },
    );
  typia.assert(allVotesResponse);
  let testVoterId: (string & tags.Format<"uuid">) | undefined = undefined;
  // If existing votes found, use the voterId of the first vote
  if (allVotesResponse.data.length > 0) {
    testVoterId = allVotesResponse.data[0].voter.id;
  } else {
    // If no votes, assign a random UUID (votes by this id will be none)
    testVoterId = typia.random<string & tags.Format<"uuid">>();
  }
  // 4. Fetch review votes filtered by specific voterId
  const filteredVotesResponse =
    await api.functional.shoppingMall.seller.sales.review_votes.index(
      sellerJoinConnection,
      {
        saleId: sale.id,
        body: {
          voter_id: testVoterId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleReviewVote.IRequest,
      },
    );
  typia.assert(filteredVotesResponse);
  // 5. Confirm all votes in filtered result have the filter voter_id
  filteredVotesResponse.data.forEach((vote) => {
    TestValidator.equals("voter ID match", vote.voter.id, testVoterId!);
  });
  // 6. Confirm pagination metadata is valid
  const pagination = filteredVotesResponse.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 1", pagination.limit >= 1);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pages >= current or zero pages",
    pagination.pages >= pagination.current || pagination.pages === 0,
  );
  // 7. Confirm fields of each vote summary object properly typed and no missing critical fields
  filteredVotesResponse.data.forEach((vote) => {
    typia.assert(vote);
    // vote.actorType should be either 'customer' or 'seller'
    TestValidator.predicate(
      "actorType is customer or seller",
      vote.actorType === "customer" || vote.actorType === "seller",
    );
    // Timestamps should be valid date-time strings
    [vote.createdAt, vote.updatedAt].forEach((dt, i) => {
      TestValidator.predicate(
        `valid date-time field ${i}`,
        typeof dt === "string" && dt.length > 0,
      );
    });
    // deletedAt may be null or string
    TestValidator.predicate(
      "deletedAt is null or string",
      vote.deletedAt === null ||
        (typeof vote.deletedAt === "string" && vote.deletedAt.length > 0),
    );
    // Each vote should have review and voter summary objects
    typia.assert(vote.review);
    typia.assert(vote.voter);
  });
}
