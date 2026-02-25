import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_review_response } from "../prepare/prepare_random_ecommerce_review_response";

export async function generate_random_ecommerce_seller_products_reviews_seller_response_create_seller_response(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceReviewResponse.ICreate>;
    params: {
      productId: string;
      reviewId: string;
    };
  },
): Promise<IEcommerceReviewResponse> {
  const prepared: IEcommerceReviewResponse.ICreate =
    prepare_random_ecommerce_review_response(props.body);
  const result: IEcommerceReviewResponse =
    await api.functional.ecommerce.seller.products.reviews.seller_response.createSellerResponse(
      connection,
      {
        productId: props.params.productId,
        reviewId: props.params.reviewId,
        body: prepared,
      },
    );
  return result;
}
