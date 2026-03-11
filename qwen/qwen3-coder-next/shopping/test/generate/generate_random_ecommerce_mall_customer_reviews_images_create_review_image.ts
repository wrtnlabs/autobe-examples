import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_review_image } from "../prepare/prepare_random_ecommerce_mall_review_image";

export async function generate_random_ecommerce_mall_customer_reviews_images_create_review_image(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallReviewImage.ICreate> | undefined;
    params: {
      reviewId: string;
    };
  },
): Promise<IEcommerceMallReviewImage> {
  const prepared: IEcommerceMallReviewImage.ICreate =
    prepare_random_ecommerce_mall_review_image(props.body);
  return await api.functional.ecommerceMall.customer.reviews.images.createReviewImage(
    connection,
    {
      body: prepared,
      reviewId: props.params.reviewId,
    },
  );
}
