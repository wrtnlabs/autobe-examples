import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReview";
import { prepare_random_community_platform_product_review } from "../prepare/prepare_random_community_platform_product_review";
export async function generate_random_community_platform_member_products_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductReview.ICreate>;
    params: {
      productCode: string;
    };
  },
): Promise<ICommunityPlatformProductReview> {
  const prepared: ICommunityPlatformProductReview.ICreate =
    prepare_random_community_platform_product_review(props.body);
  const result: ICommunityPlatformProductReview =
    await api.functional.communityPlatform.member.products.reviews.create(
      connection,
      {
        productCode: props.params.productCode,
        body: prepared,
      },
    );
  return result;
}
