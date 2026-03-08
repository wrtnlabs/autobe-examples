import api from "@ORGANIZATION/PROJECT-api";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_shopping_mall_review } from "../prepare/prepare_random_shopping_mall_review";

export async function generate_random_shopping_mall_customer_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReview.ICreate>;
  }
): Promise<IShoppingMallReview> {
  const prepared: IShoppingMallReview.ICreate = prepare_random_shopping_mall_review(props.body);
  const result: IShoppingMallReview = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}