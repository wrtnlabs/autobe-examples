import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Public retrieval of a published econDiscuss post by ID (no authentication).
 *
 * Purpose
 *
 * - Verify that once a member publishes a post, it can be retrieved by its ID
 *   through the public endpoint without any authentication header.
 *
 * Steps
 *
 * 1. Join as a new Member (acquire authenticated session).
 * 2. Create a post (title/body/summary).
 * 3. Publish: update scheduled_publish_at to an immediate past time (now - 1s) to
 *    ensure the post becomes publicly visible per service policy.
 * 4. Clone connection into an unauthenticated one (headers: {}) and retrieve the
 *    post via GET /econDiscuss/posts/{postId}.
 * 5. Validate essential fields and author linkage, and assert published_at is set.
 */
export async function test_api_post_public_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1) Join as a new Member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // MinLength<8>
    display_name: RandomGenerator.name(2), // 2-word display name
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a post
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
    }),
    summary: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IEconDiscussPost.ICreate;
  const created = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(created);

  // Validate author linkage for the created post
  TestValidator.equals(
    "created post author is the joined member",
    created.author_user_id,
    authorized.id,
  );

  // 3) Publish the post by scheduling its publish time in the past (now - 1s)
  const publishAt = new Date(Date.now() - 1_000).toISOString();
  const updated = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: created.id,
      body: {
        scheduled_publish_at: publishAt,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(updated);

  // 4) Retrieve publicly without authentication
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const fetched = await api.functional.econDiscuss.posts.at(publicConn, {
    postId: created.id,
  });
  typia.assert(fetched);

  // 5) Validate core fields and publication state
  TestValidator.equals(
    "public fetch id matches created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "public post author matches member id",
    fetched.author_user_id,
    authorized.id,
  );
  TestValidator.equals(
    "public title equals original",
    fetched.title,
    createBody.title,
  );
  TestValidator.equals(
    "public body equals original",
    fetched.body,
    createBody.body,
  );
  TestValidator.equals(
    "public summary equals original",
    fetched.summary,
    createBody.summary,
  );

  // published_at must be set for a publicly visible post
  const publishedAt = typia.assert<string & tags.Format<"date-time">>(
    fetched.published_at!,
  );
  // created_at / updated_at already type-validated by typia.assert on the whole entity
}
