import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_snapshot_indices_member_own_review_history_ordered(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // TODO: In a complete scenario, this reviewId should be obtained from
  // member-created review snapshot events (create/edit/delete). Since
  // review mutation endpoints were not provided in the prompt inputs,
  // we use a syntactically valid UUID as a fallback.
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const output: IPageIShoppingMallReviewSnapshotsIndex.ISummary =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.index(
      memberConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 10,
          sortDirection: "asc",
          includeDeleted: false,
        } satisfies IShoppingMallReviewSnapshotsIndex.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  if (output.pagination.records === 0) {
    TestValidator.equals(
      "pagination pages when no records",
      output.pagination.pages,
      0,
    );
  } else {
    const expectedPages = Math.ceil(
      output.pagination.records / output.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages matches",
      output.pagination.pages,
      expectedPages,
    );
  }
  const records = output.data;
  for (const item of records) {
    TestValidator.equals("reviewId matches", item.reviewId, reviewId);
    TestValidator.predicate("id exists", item.id.length > 0);
    TestValidator.predicate(
      "snapshotSequence is non-negative",
      item.snapshotSequence >= 0,
    );
  }
  for (let i = 1; i < records.length; ++i) {
    TestValidator.predicate(
      `snapshotSequence non-decreasing at index ${i}`,
      records[i].snapshotSequence >= records[i - 1].snapshotSequence,
    );
  }
  TestValidator.predicate(
    "includeDeleted=false excludes deletedAt entries",
    !records.some((x) => x.deletedAt !== null),
  );
}
