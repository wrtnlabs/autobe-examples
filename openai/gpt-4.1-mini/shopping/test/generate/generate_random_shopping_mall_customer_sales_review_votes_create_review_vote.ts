import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_review_vote } from "../prepare/prepare_random_shopping_mall_sale_review_vote";

export async function generate_random_shopping_mall_customer_sales_review_votes_create_review_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleReviewVote.ICreate> | undefined;
    params: {
      saleId: string;
    };
  },
): Promise<IShoppingMallSaleReviewVote> {
  const prepared: IShoppingMallSaleReviewVote.ICreate =
    prepare_random_shopping_mall_sale_review_vote(props.body);
  const result: IShoppingMallSaleReviewVote =
    await api.functional.shoppingMall.customer.sales.review_votes.createReviewVote(
      connection,
      {
        saleId: props.params.saleId,
        body: prepared,
      },
    );
  return result;
}
