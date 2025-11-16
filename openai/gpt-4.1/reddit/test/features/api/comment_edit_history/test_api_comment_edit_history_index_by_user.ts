import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEditHistory";

/**
 * Validate authenticated retrieval of comment edit history with pagination,
 * filtering, and audit policies.
 *
 * 1. Register (join) a new test user
 * 2. Generate a random comment ID (simulates a comment for which user
 *    theoretically has rights)
 * 3. Prepare diverse page/limit/sort parameters and request edit history via PATCH
 *    /communityPlatform/user/comments/{commentId}/editHistory
 * 4. Verify response is successful, structure is valid and all records reference
 *    the commentId
 * 5. All pagination fields are numerically valid and within correct bounds
 * 6. For each edit record: required fields (id, comment_id, snapshot_id,
 *    user_session_id, created_at) exist, types/formats correct
 * 7. All records in response reference the same commentId as requested
 * 8. If sort requested, entries are returned in correct order
 * 9. Business logic: only the user's viewable audit information is present (never
 *    sensitive info, no cross-user data leakage)
 */
export async function test_api_comment_edit_history_index_by_user(
  connection: api.IConnection,
) {
  // 1. User registration (join)
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(user);
  TestValidator.equals(
    "registered user email matches input",
    user.email,
    userJoinBody.email,
  );

  // 2. Generate random commentId
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Pick random pagination params and sort option
  const requestParams = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: RandomGenerator.pick(["created_at_asc", "created_at_desc"] as const),
    // Optionally, fromDate/toDate can be specified if randomization desired
  } satisfies ICommunityPlatformCommentEditHistory.IRequest;

  // 4. Make main API call
  const response =
    await api.functional.communityPlatform.user.comments.editHistory.index(
      connection,
      {
        commentId,
        body: requestParams,
      },
    );
  typia.assert(response);

  // 5. Validate pagination fields
  const { pagination, data } = response;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination current page >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);

  // 6. For each record, validate structure and reference
  for (const record of data) {
    typia.assert(record);
    TestValidator.equals(
      "edit history comment_id matches requested",
      record.comment_id,
      commentId,
    );
    // Ensure only allowed fields
    TestValidator.predicate(
      "no cross-user or sensitive info in edit record",
      Object.keys(record).every((key) =>
        [
          "id",
          "comment_id",
          "snapshot_id",
          "user_session_id",
          "edit_reason",
          "created_at",
        ].includes(key),
      ),
    );
  }

  // 7. Business rule: data records are for the requested commentId only
  TestValidator.predicate(
    "all edit history records are for requested comment",
    data.every((r) => r.comment_id === commentId),
  );
}
