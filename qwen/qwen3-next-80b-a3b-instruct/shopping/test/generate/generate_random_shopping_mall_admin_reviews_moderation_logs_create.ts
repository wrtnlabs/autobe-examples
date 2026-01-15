import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";
import { prepare_random_shopping_mall_review_moderation_log } from "../prepare/prepare_random_shopping_mall_review_moderation_log";
export async function generate_random_shopping_mall_admin_reviews_moderation_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewModerationLog.ICreate> | undefined;
    params: {
      reviewId: string;
    };
  },
): Promise<IShoppingMallReviewModerationLog> {
  const prepared: IShoppingMallReviewModerationLog.ICreate =
    prepare_random_shopping_mall_review_moderation_log(props.body);
  return await api.functional.shoppingMall.admin.reviews.moderation_logs.create(
    connection,
    {
      body: prepared,
      reviewId: props.params.reviewId,
    },
  );
}
