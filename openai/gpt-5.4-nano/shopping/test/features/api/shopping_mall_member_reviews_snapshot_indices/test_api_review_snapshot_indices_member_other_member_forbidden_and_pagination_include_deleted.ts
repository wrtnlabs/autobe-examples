import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
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

export async function test_api_review_snapshot_indices_member_other_member_forbidden_and_pagination_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const reviewOfMemberA =
    await generate_random_shopping_mall_member_reviews_create(
      memberAConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(reviewOfMemberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  await TestValidator.httpError(
    "member B must not access member A snapshot indices",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.member.reviews.snapshot_indices.index(
        memberBConnection,
        {
          reviewId: reviewOfMemberA.id,
          body: {
            page,
            limit,
            sortDirection: "desc",
            includeDeleted: true,
          } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
        },
      );
    },
  );
  const result =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.index(
      memberAConnection,
      {
        reviewId: reviewOfMemberA.id,
        body: {
          page,
          limit,
          sortDirection: "desc",
          includeDeleted: true,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "pagination current page",
    result.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", result.pagination.limit, limit);
  TestValidator.predicate(
    "result length within limit",
    result.data.length <= limit,
  );
  for (let i = 0; i + 1 < result.data.length; ++i) {
    TestValidator.predicate(
      `snapshotSequence desc ordering at ${i}`,
      result.data[i].snapshotSequence >= result.data[i + 1].snapshotSequence,
    );
  }
  for (const item of result.data) {
    if (item.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt must be an ISO date-time string when not null",
        item.deletedAt.length > 0 && !Number.isNaN(Date.parse(item.deletedAt)),
      );
    } else {
      TestValidator.equals(
        "deletedAt null when not deleted",
        item.deletedAt,
        null,
      );
    }
  }
}
