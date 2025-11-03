import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardComment";
import type { ICivicBoardCommentReactionCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardCommentReactionCount";
import type { ICivicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPost";
import type { ICivicBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUser";
import type { ICivicBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUserSession";
import type { IECivicBoardCommentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardCommentStatus";
import type { IECivicBoardContentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardContentStatus";
import type { IECivicBoardPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardPostStatus";

export async function test_api_comment_reaction_count_deleted_parent_post_unavailable(
  connection: api.IConnection,
) {
  /**
   * Validate that when a parent post is soft-deleted, public access to the
   * comment reaction-count endpoint becomes unavailable due to inherited
   * visibility rules.
   *
   * Steps:
   *
   * 1. Author joins (SDK sets Authorization automatically)
   * 2. Create a Published post
   * 3. Create a Published comment under the post
   * 4. Validate preconditions: both post and comment are Published
   * 5. From a public (unauthenticated) connection, call reactions/count → success
   * 6. Soft-delete the parent post
   * 7. From the public connection, call reactions/count again → expect error
   */

  // 1) Register author (join)
  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
      >(),
      referrer: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
      >(),
    } satisfies ICivicBoardUser.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a Published post
  const post = await api.functional.civicBoard.user.posts.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 8,
        sentenceMax: 12,
      }),
    } satisfies ICivicBoardPost.ICreate,
  });
  typia.assert(post);

  // 3) Create a Published comment under the post
  const comment = await api.functional.civicBoard.user.posts.comments.create(
    connection,
    {
      postId: post.id,
      body: {
        body: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ICivicBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4) Preconditions: post & comment are Published and linkages match
  TestValidator.equals("post is Published", post.status, "Published");
  TestValidator.equals("comment is Published", comment.status, "Published");
  TestValidator.equals(
    "comment belongs to the created post",
    comment.civic_board_post_id,
    post.id,
  );

  // Prepare a public (unauthenticated) connection for public access tests
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 5) Before deletion: public should read reaction count successfully
  const initialCount =
    await api.functional.civicBoard.comments.reactions.count.at(publicConn, {
      commentId: comment.id,
    });
  typia.assert(initialCount);

  // 6) Soft-delete the parent post (author context)
  await api.functional.civicBoard.user.posts.erase(connection, {
    postId: post.id,
  });

  // 7) After deletion: public access must fail (not-available outcome)
  await TestValidator.error(
    "public reaction-count becomes unavailable after parent post deletion",
    async () => {
      await api.functional.civicBoard.comments.reactions.count.at(publicConn, {
        commentId: comment.id,
      });
    },
  );
}
