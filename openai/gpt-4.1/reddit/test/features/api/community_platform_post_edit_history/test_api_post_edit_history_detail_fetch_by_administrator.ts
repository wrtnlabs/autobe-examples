import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";

/**
 * Test administrator access to post edit history detail.
 *
 * 1. Register (join) as administrator (obtain authorization for privileged
 *    endpoints).
 * 2. Request the edit history list of a random post (using random UUID for broad
 *    test coverage, accepting possibility of no records).
 *
 *    - If the returned list contains any records: a. Pick the first edit history
 *         record; fetch full detail using (postId, editHistoryId) from this
 *         record. b. Validate that all detail fields (old/new title/body, edit
 *         reason, user summary, session summary, created_at, ids, etc.) match
 *         list summary and are present. c. Assert detail matches what was
 *         listed.
 *    - If the list is empty: skip to error scenarios (since there's no valid
 *         editHistoryId to test success path).
 * 3. Edge case: Attempt to fetch edit history detail with a random, non-existent
 *    editHistoryId (with a random valid UUID for postId).
 *
 *    - Validate that an error occurs (API throws and does not return a valid
 *         ICommunityPlatformPostEditHistory).
 * 4. Edge case: Use a real postId but supply a fake/invalid editHistoryId (not in
 *    the returned list).
 *
 *    - Validate proper error response for invalid editHistoryId under a valid post
 *         context.
 */
export async function test_api_post_edit_history_detail_fetch_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register as administrator
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Get edit history list for a random post ID
  const postId = typia.random<string & tags.Format<"uuid">>();
  const historyPage =
    await api.functional.communityPlatform.administrator.posts.editHistory.index(
      connection,
      {
        postId,
        body: {},
      },
    );
  typia.assert(historyPage);

  if (historyPage.data.length > 0) {
    // Select the first record
    const firstHistory = historyPage.data[0];
    // 2a. Fetch detail for the first record
    const detail =
      await api.functional.communityPlatform.administrator.posts.editHistory.at(
        connection,
        {
          postId: firstHistory.post_id,
          editHistoryId: firstHistory.id,
        },
      );
    typia.assert(detail);

    // 2b. Validate matching fields & structure
    TestValidator.equals(
      "edit history detail: id matches source list",
      detail.id,
      firstHistory.id,
    );
    TestValidator.equals(
      "edit history detail: post_id matches",
      detail.post_id,
      firstHistory.post_id,
    );
    TestValidator.equals(
      "edit history detail: user summary",
      detail.user,
      firstHistory.user,
    );
    TestValidator.equals(
      "edit history detail: session summary",
      detail.userSession,
      firstHistory.userSession,
    );
    TestValidator.equals(
      "edit history detail: old_title matches",
      detail.old_title,
      firstHistory.old_title,
    );
    TestValidator.equals(
      "edit history detail: old_body matches",
      detail.old_body,
      firstHistory.old_body,
    );
    TestValidator.equals(
      "edit history detail: new_title matches",
      detail.new_title,
      firstHistory.new_title,
    );
    TestValidator.equals(
      "edit history detail: new_body matches",
      detail.new_body,
      firstHistory.new_body,
    );
    TestValidator.equals(
      "edit history detail: edit_reason matches",
      detail.edit_reason,
      firstHistory.edit_reason,
    );
    TestValidator.equals(
      "edit history detail: created_at matches",
      detail.created_at,
      firstHistory.created_at,
    );
  }

  // 3. Edge: Fetch with non-existent editHistoryId for random postId
  await TestValidator.error(
    "detail fetch: error for non-existent editHistoryId",
    async () => {
      await api.functional.communityPlatform.administrator.posts.editHistory.at(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          editHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4. Edge: Fetch with valid postId but invalid editHistoryId
  if (historyPage.data.length > 0) {
    const realPostId = historyPage.data[0].post_id;
    await TestValidator.error(
      "detail fetch: error for valid postId but fake editHistoryId",
      async () => {
        await api.functional.communityPlatform.administrator.posts.editHistory.at(
          connection,
          {
            postId: realPostId,
            editHistoryId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
}
