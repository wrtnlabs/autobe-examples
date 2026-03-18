import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_member_review_update_blocked_when_order_item_not_delivered(
  connection: api.IConnection,
): Promise<void> {
  // <SCENARIO DESCRIPTION HERE>
  // Member cannot update a review when the linked order item is not delivered.
  // 1) Authenticate/register a member.
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Create an actor-specific connection using the issued access token.
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: member.token.access,
  };
  // 2) This test requires a pre-seeded review whose linked order item is
  //    in NOT-delivered state. Provide it via environment variable.
  const fixtureReviewIdRaw: string | undefined =
    process.env["SHOPPING_MALL_NON_DELIVERED_REVIEW_ID"];
  TestValidator.predicate(
    "fixture reviewId for non-delivered order item must be provided",
    () => fixtureReviewIdRaw !== undefined && fixtureReviewIdRaw.length > 0,
  );
  const fixtureReviewId = typia.assert<string & tags.Format<"uuid">>(
    fixtureReviewIdRaw!,
  );
  // 3) Attempt to update the review; must be rejected by delivery eligibility.
  const rating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const newBody = RandomGenerator.paragraph({ sentences: 2 });
  const newIsPublic = typia.random<boolean>();
  await TestValidator.error(
    "member cannot update review when linked order item is not delivered",
    async () => {
      await api.functional.shoppingMall.member.reviews.update(userConnection, {
        reviewId: fixtureReviewId,
        body: {
          rating,
          body: newBody,
          is_public: newIsPublic,
        } satisfies IShoppingMallReview.IUpdate,
      });
    },
  );
}
