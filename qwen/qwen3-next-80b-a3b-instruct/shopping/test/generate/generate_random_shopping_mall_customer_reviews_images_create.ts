import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import { prepare_random_shopping_mall_review_image } from "../prepare/prepare_random_shopping_mall_review_image";
export async function generate_random_shopping_mall_customer_reviews_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewImage.ICreate> | undefined;
    params: {
      reviewId: string;
    };
  },
): Promise<IShoppingMallReviewImage> {
  const prepared: IShoppingMallReviewImage.ICreate =
    prepare_random_shopping_mall_review_image(props.body);
  return await api.functional.shoppingMall.customer.reviews.images.create(
    connection,
    {
      body: prepared,
      reviewId: props.params.reviewId,
    },
  );
}
