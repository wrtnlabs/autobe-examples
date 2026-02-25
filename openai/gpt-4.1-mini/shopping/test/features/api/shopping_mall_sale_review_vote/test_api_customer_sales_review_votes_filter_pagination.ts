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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_customer_sales_review_votes_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join with known password
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "seller-password-1234";
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: { password: sellerPassword },
  });
  // 2. Seller login with correct password
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogged = await authorize_seller_login(sellerLoginConnection, {
    body: { email: seller.email, password: sellerPassword },
  });
  // 3. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(sale);
  // 4. Customer join with known password
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerPassword = "customer-password-1234";
  const customer = await authorize_customer_join(customerJoinConnection, {
    body: { password: customerPassword },
  });
  // 5. Customer login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogged = await authorize_customer_login(
    customerLoginConnection,
    {
      body: { email: customer.email, password: customerPassword },
    },
  );
  // 6. Seller queries all review votes for own sale without filters (default pagination)
  const reviewVotesAll =
    await api.functional.shoppingMall.customer.sales.review_votes.index(
      sellerLoginConnection,
      {
        saleId: sale.id,
        body: { page: 1, limit: 20 },
      },
    );
  typia.assertGuard<IPageIShoppingMallSaleReviewVote.ISummary>(reviewVotesAll);
  // 7. Seller queries review votes by actor_type filter
  const actorTypeFilter = { actor_type: "customer", page: 1, limit: 10 };
  const reviewVotesCustomer =
    await api.functional.shoppingMall.customer.sales.review_votes.index(
      sellerLoginConnection,
      {
        saleId: sale.id,
        body: actorTypeFilter,
      },
    );
  typia.assertGuard<IPageIShoppingMallSaleReviewVote.ISummary>(
    reviewVotesCustomer,
  );
  // 8. Seller queries review votes by createdAt date range
  const now = new Date();
  const dateFilter = {
    createdAtGte: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    createdAtLte: now.toISOString(),
    page: 1,
    limit: 10,
  };
  const reviewVotesDateFiltered =
    await api.functional.shoppingMall.customer.sales.review_votes.index(
      sellerLoginConnection,
      {
        saleId: sale.id,
        body: dateFilter,
      },
    );
  typia.assertGuard<IPageIShoppingMallSaleReviewVote.ISummary>(
    reviewVotesDateFiltered,
  );
  // 9. Seller queries review votes by voter_id filter if there is data
  if (reviewVotesAll.data.length > 0) {
    const voterIdFilter = {
      voter_id: reviewVotesAll.data[0].voter.id,
      page: 1,
      limit: 10,
    };
    const reviewVotesVoterFiltered =
      await api.functional.shoppingMall.customer.sales.review_votes.index(
        sellerLoginConnection,
        {
          saleId: sale.id,
          body: voterIdFilter,
        },
      );
    typia.assertGuard<IPageIShoppingMallSaleReviewVote.ISummary>(
      reviewVotesVoterFiltered,
    );
    // Validate all votes match voter_id
    reviewVotesVoterFiltered.data.forEach((vote) => {
      TestValidator.equals(
        "voter id must match",
        vote.voter.id,
        voterIdFilter.voter_id!,
      );
      TestValidator.equals("saleId must match", vote.review.sale.id, sale.id);
    });
  }
  // 10. Test invalid actor_type filter value
  await TestValidator.error("invalid actor_type filter", async () => {
    await api.functional.shoppingMall.customer.sales.review_votes.index(
      sellerLoginConnection,
      {
        saleId: sale.id,
        body: { actor_type: "invalid-actor", page: 1, limit: 10 },
      },
    );
  });
  // 11. Unauthorized access test: Another customer tries to get review votes
  await TestValidator.error("unauthorized customer access", async () => {
    await api.functional.shoppingMall.customer.sales.review_votes.index(
      customerLoginConnection,
      {
        saleId: sale.id,
        body: { page: 1, limit: 10 },
      },
    );
  });
  // 12. Unauthorized access test: No auth header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access", async () => {
    await api.functional.shoppingMall.customer.sales.review_votes.index(
      noAuthConnection,
      {
        saleId: sale.id,
        body: { page: 1, limit: 10 },
      },
    );
  });
  // 13. Validate that all returned review votes have saleId matching the created sale
  reviewVotesAll.data.forEach((vote) => {
    TestValidator.equals("saleId must match", vote.review.sale.id, sale.id);
  });
  // 14. Validate that actorType matches actor_type filter in filtered results
  reviewVotesCustomer.data.forEach((vote) => {
    TestValidator.equals(
      "actorType must be 'customer'",
      vote.actorType,
      actorTypeFilter.actor_type!,
    );
  });
  // 15. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is at least 1",
    reviewVotesAll.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reviewVotesAll.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    reviewVotesAll.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    reviewVotesAll.pagination.pages >= 0,
  );
}
