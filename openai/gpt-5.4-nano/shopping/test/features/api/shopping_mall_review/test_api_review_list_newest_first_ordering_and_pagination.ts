import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
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

export async function test_api_review_list_newest_first_ordering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberAuthorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: memberAuthorized.token.access,
  };

  const reviewA = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_item_id:
          typia.assert<
            IShoppingMallReview.ICreate["shopping_mall_order_item_id"]
          >(typia.random<number>()),
        rating: 5,
        is_public: true,
        body: "original-a",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(reviewA);

  const reviewB = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_item_id:
          typia.assert<
            IShoppingMallReview.ICreate["shopping_mall_order_item_id"]
          >(typia.random<number>()),
        rating: 4,
        is_public: true,
        body: "original-b",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(reviewB);

  let baseProductId = reviewA.product.id;
  let editedReview = reviewA;
  let otherReview = reviewB;

  for (let attempt = 0; attempt < 5; attempt++) {
    if (otherReview.product.id === baseProductId) break;
    const next = await generate_random_shopping_mall_member_reviews_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id:
            typia.assert<
              IShoppingMallReview.ICreate["shopping_mall_order_item_id"]
            >(typia.random<number>()),
          rating: 4,
          is_public: true,
          body: `original-b-${attempt}`,
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    typia.assert(next);
    otherReview = next;
  }

  baseProductId = editedReview.product.id;
  const updated = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: editedReview.id,
      body: {
        rating: editedReview.rating,
        is_public: editedReview.is_public,
        body: "edited",
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updated);

  const page1 = await api.functional.shoppingMall.member.reviews.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "newest",
        shoppingMallProductId: baseProductId,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.predicate("page1 has reviews", () => page1.data.length > 0);
  const idsPage1 = page1.data.map((x) => x.id);
  TestValidator.predicate("edited review is present", () =>
    idsPage1.includes(updated.id),
  );

  for (let i = 1; i < page1.data.length; ++i) {
    const prev = page1.data[i - 1];
    const cur = page1.data[i];
    const prevUpdated = new Date(prev.updatedAt).getTime();
    const curUpdated = new Date(cur.updatedAt).getTime();
    const prevCreated = new Date(prev.createdAt).getTime();
    const curCreated = new Date(cur.createdAt).getTime();
    const ok =
      prevUpdated > curUpdated ||
      (prevUpdated === curUpdated && prevCreated >= curCreated);
    TestValidator.predicate(`newest-first order at ${i}`, () => ok);
  }

  const editedIndex = idsPage1.indexOf(updated.id);
  TestValidator.predicate("edited review is the newest among returned", () => {
    const editedItem = page1.data[editedIndex];
    const newerExists = page1.data
      .filter((r) => r.id !== updated.id)
      .some((r) => {
        const editedUpdated = new Date(editedItem.updatedAt).getTime();
        const rUpdated = new Date(r.updatedAt).getTime();
        if (rUpdated > editedUpdated) return true;
        if (rUpdated < editedUpdated) return false;
        const editedCreated = new Date(editedItem.createdAt).getTime();
        const rCreated = new Date(r.createdAt).getTime();
        return rCreated > editedCreated;
      });
    return !newerExists;
  });

  const page2 = await api.functional.shoppingMall.member.reviews.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
        sort: "newest",
        shoppingMallProductId: baseProductId,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals(
    "records same",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "limit same",
    page2.pagination.limit,
    page1.pagination.limit,
  );

  if (page1.pagination.pages >= 2) {
    TestValidator.predicate(
      "page2 differs when there is another page",
      () =>
        page2.data.length === 0 ||
        (page1.data.length > 0 && page2.data[0].id !== page1.data[0].id),
    );
  }

  const activeList = await api.functional.shoppingMall.member.reviews.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "newest",
        shoppingMallProductId: baseProductId,
        includeDeleted: false,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(activeList);
  TestValidator.predicate("no deleted reviews in activeList", () =>
    activeList.data.every((x) => x.deletedAt === null),
  );

  const omittedList = await api.functional.shoppingMall.member.reviews.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "newest",
        shoppingMallProductId: baseProductId,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(omittedList);
  TestValidator.equals(
    "omittedList length",
    omittedList.data.length,
    activeList.data.length,
  );
}
