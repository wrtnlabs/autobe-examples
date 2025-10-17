import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostSnapshot";

/**
 * Validate that post version snapshots become inaccessible after the post is
 * soft-deleted.
 *
 * Steps:
 *
 * 1. Join as a member (authentication is required for mutations).
 * 2. Create a post.
 * 3. Update the post to ensure at least one snapshot exists.
 * 4. Query versions before deletion and verify non-empty snapshots all belonging
 *    to the post.
 * 5. Soft-delete the post.
 * 6. Verify versions search now results in an error (do not assert status code).
 */
export async function test_api_post_versions_search_post_deleted_not_found(
  connection: api.IConnection,
) {
  // 1) Join as a member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Pw-${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a post
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
    }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: createBody,
    });
  typia.assert(post);

  // 3) Update the post to create at least one snapshot
  const updateBody = {
    title: `${createBody.title} (edited)`,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IEconDiscussPost.IUpdate;
  const updated: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4) Query versions BEFORE deletion and validate
  const versionsRequestBefore = {
    page: 1,
    pageSize: 10,
    sort_by: "version",
    order: "desc",
  } satisfies IEconDiscussPostSnapshot.IRequest;
  const pageBefore: IPageIEconDiscussPostSnapshot =
    await api.functional.econDiscuss.posts.versions.index(connection, {
      postId: post.id,
      body: versionsRequestBefore,
    });
  typia.assert(pageBefore);
  await TestValidator.predicate(
    "pre-deletion: versions list should not be empty",
    async () => pageBefore.data.length > 0,
  );
  await TestValidator.predicate(
    "pre-deletion: every snapshot belongs to the created post",
    async () =>
      pageBefore.data.every((s) => s.econ_discuss_post_id === post.id),
  );

  // 5) Soft-delete the post
  await api.functional.econDiscuss.member.posts.erase(connection, {
    postId: post.id,
  });

  // 6) Versions search AFTER deletion should result in an error
  const versionsRequestAfter = {
    page: 1,
    pageSize: 10,
    sort_by: "version",
    order: "desc",
  } satisfies IEconDiscussPostSnapshot.IRequest;
  await TestValidator.error(
    "post-deletion: versions search must fail for retired post",
    async () => {
      await api.functional.econDiscuss.posts.versions.index(connection, {
        postId: post.id,
        body: versionsRequestAfter,
      });
    },
  );
}
