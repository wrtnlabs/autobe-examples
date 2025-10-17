import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Verify that unauthenticated PUT /econDiscuss/member/posts/{postId} is
 * rejected.
 *
 * Steps:
 *
 * 1. Register a new member (SDK sets Authorization token on connection).
 * 2. Create a post as the authenticated member and capture its id.
 * 3. Clone an unauthenticated connection (headers: {}) and attempt to update the
 *    post using IEconDiscussPost.IUpdate. Expect error (authentication
 *    boundary).
 * 4. Control: Perform the same update using the authenticated connection and
 *    verify success and changed content.
 */
export async function test_api_post_update_unauthenticated_rejected_401(
  connection: api.IConnection,
) {
  // 1) Register member (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P${RandomGenerator.alphaNumeric(9)}`,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(authorized);

  // 2) Create a post
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEconDiscussPost.ICreate;
  const created: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Prepare update data
  const updateBody = {
    title: `${createBody.title} - updated`,
  } satisfies IEconDiscussPost.IUpdate;

  // 3) Attempt update without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated update must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.update(unauthConn, {
        postId: created.id,
        body: updateBody,
      });
    },
  );

  // 4) Control check: authenticated update should succeed
  const updated: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.update(connection, {
      postId: created.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "title updated as requested",
    updated.title,
    updateBody.title,
  );
}
