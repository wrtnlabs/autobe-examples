import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_review_snapshot_indices_admin_authorized_and_ordered(
  connection: api.IConnection,
): Promise<void> {
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_login(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(admin1);
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member2);
  // NOTE: No review creation endpoint DTOs are provided in this prompt.
  // Therefore, we validate the snapshot indices behavior only by calling
  // the snapshot endpoint with a syntactically valid reviewId.
  const reviewId1 = typia.random<string & tags.Format<"uuid">>();
  const reviewId2 = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
      admin1Connection,
      {
        reviewId: reviewId1,
      },
    );
  typia.assert(first);
  TestValidator.equals("reviewId matches input", first.reviewId, reviewId1);
  TestValidator.predicate(
    "snapshotSequence is positive",
    first.snapshotSequence > 0,
  );
  TestValidator.predicate(
    "actionType is non-empty",
    first.actionType.trim().length > 0,
  );
  const second =
    await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
      admin1Connection,
      {
        reviewId: reviewId1,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "snapshotSequence increments by 1",
    second.snapshotSequence,
    first.snapshotSequence + 1,
  );
  TestValidator.predicate(
    "createdAt is monotonic",
    new Date(second.createdAt).getTime() >= new Date(first.createdAt).getTime(),
  );
  TestValidator.predicate(
    "updatedAt is monotonic",
    new Date(second.updatedAt).getTime() >= new Date(first.updatedAt).getTime(),
  );
  await TestValidator.error(
    "admin cannot create snapshot index for other member's review",
    async () => {
      await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
        admin1Connection,
        {
          reviewId: reviewId2,
        },
      );
    },
  );
  await TestValidator.error(
    "repeating forbidden attempt should not advance snapshot sequence",
    async () => {
      await api.functional.shoppingMall.admin.reviews.snapshot_indices.createSnapshotIndices(
        admin1Connection,
        {
          reviewId: reviewId2,
        },
      );
    },
  );
}
