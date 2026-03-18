import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_snapshot_indices_admin_access_ordering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  const reviewIdNonEmpty = typia.random<string & tags.Format<"uuid">>();
  const reviewIdEmpty = typia.random<string & tags.Format<"uuid">>();
  const nonEmptyPage =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.indexSnapshotIndices(
      adminConnection,
      {
        reviewId: reviewIdNonEmpty,
      },
    );
  typia.assert(nonEmptyPage);
  let lastSequence: number | null = null;
  for (const item of nonEmptyPage.data) {
    typia.assert(item);
    TestValidator.predicate("snapshotSequence is non-decreasing", () => {
      if (lastSequence === null) return true;
      return item.snapshotSequence >= lastSequence;
    });
    lastSequence = item.snapshotSequence;
    if (item.deletedAt === null) {
      TestValidator.predicate("non-deleted entry has deletedAt null", true);
    } else {
      TestValidator.predicate(
        "deleted entry has deletedAt non-null",
        item.deletedAt !== null,
      );
    }
  }
  const emptyPage =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.indexSnapshotIndices(
      adminConnection,
      {
        reviewId: reviewIdEmpty,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty data array", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty pagination records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("empty pagination pages", emptyPage.pagination.pages, 0);
  await TestValidator.error(
    "member cannot access admin review snapshot indices",
    async () => {
      await api.functional.shoppingMall.admin.reviews.snapshot_indices.indexSnapshotIndices(
        memberConnection,
        {
          reviewId: reviewIdNonEmpty,
        },
      );
    },
  );
}
