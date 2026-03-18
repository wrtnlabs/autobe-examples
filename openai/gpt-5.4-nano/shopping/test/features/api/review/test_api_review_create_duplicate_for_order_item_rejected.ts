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

export async function test_api_review_create_duplicate_for_order_item_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });

  // 2) Create an initial review (delivered order item prerequisite handled by generator)
  const initialReview = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {} as DeepPartial<IShoppingMallReview.ICreate>,
    } as unknown as { body: DeepPartial<IShoppingMallReview.ICreate> },
  );
  typia.assert(initialReview);

  // 3) Attempt to create a duplicate review for the same delivered order item
  const duplicateBody = {
    shopping_mall_order_item_id: initialReview.orderItem,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    body: RandomGenerator.paragraph({ sentences: 2 }),
    is_public: initialReview.is_public,
  } satisfies IShoppingMallReview.ICreate;

  await TestValidator.error(
    "duplicate review for same order item should be rejected",
    async () => {
      await generate_random_shopping_mall_member_reviews_create(
        memberConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
