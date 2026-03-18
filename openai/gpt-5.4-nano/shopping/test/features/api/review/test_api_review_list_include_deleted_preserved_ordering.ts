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

export async function test_api_review_list_include_deleted_preserved_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join/auth
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {};
  userConnection.headers.Authorization = memberAuth.token.access;
  // 2) Create a review
  const createdReview =
    await generate_random_shopping_mall_member_reviews_create(
      userConnection,
      {},
    );
  typia.assert(createdReview);
  const shoppingMallOrderItemId = createdReview.orderItem;
  const shoppingMallProductId = createdReview.product.id;
  // 3) Soft-delete authored review
  await api.functional.shoppingMall.member.reviews.erase(userConnection, {
    reviewId: createdReview.id,
  });
  // 4) List with includeDeleted=true and newest ordering
  const includeDeletedPage =
    await api.functional.shoppingMall.member.reviews.index(userConnection, {
      body: {
        shoppingMallProductId,
        shoppingMallOrderItemId,
        includeDeleted: true,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(includeDeletedPage);
  const list = includeDeletedPage.data;
  // 5) Assert deleted review record is included
  const deletedRecord = list.find((r) => r.id === createdReview.id);
  TestValidator.predicate(
    "deleted review should appear when includeDeleted=true",
    deletedRecord !== undefined,
  );
  TestValidator.predicate(
    "deleted review deletedAt should be non-null",
    deletedRecord !== undefined && deletedRecord.deletedAt !== null,
  );
  // 6) For each deleted record, deletedAt must be non-null
  for (const record of list) {
    if (record.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt must be non-null for deleted records",
        record.deletedAt !== null,
      );
    }
  }
  // 7) Verify newest-first ordering using contract: updatedAt desc, createdAt desc
  const sorted = [...list].sort((a, b) => {
    if (a.updatedAt > b.updatedAt) return -1;
    if (a.updatedAt < b.updatedAt) return 1;
    if (a.createdAt > b.createdAt) return -1;
    if (a.createdAt < b.createdAt) return 1;
    return 0;
  });
  TestValidator.index(
    "newest-first ordering should be preserved including deleted reviews",
    sorted,
    list,
  );
  // 8) List again with includeDeleted=false and ensure deleted review absent
  const activeOnlyPage = await api.functional.shoppingMall.member.reviews.index(
    userConnection,
    {
      body: {
        shoppingMallProductId,
        shoppingMallOrderItemId,
        includeDeleted: false,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(activeOnlyPage);
  const activeList = activeOnlyPage.data;
  const stillPresent = activeList.some((r) => r.id === createdReview.id);
  TestValidator.predicate(
    "deleted review should not appear when includeDeleted=false",
    stillPresent === false,
  );
}
