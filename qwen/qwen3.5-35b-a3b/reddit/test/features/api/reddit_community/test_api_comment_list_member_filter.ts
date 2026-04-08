import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

/**
 * Test the member_id filter for listing comments on a post.
 *
 * Validates the member_id filtering functionality for the comments listing API endpoint, ensuring that only comments from the specified member are returned. The test creates multiple members (Alice, Bob, Charlie), generates comments from each member on the same post, then verifies that filtering by member_id returns the correct subset of comments.
 *
 * The test validates filtering accuracy, pagination metadata, author information correctness, and compatibility with other query parameters like sort_by and include_replies.
 *
 * 1. Setup: Register three members (Alice, Bob, Charlie) with unique credentials.
 * 2. Setup: Create a post that all members can comment on.
 * 3. Setup: Alice writes 3 comments, Bob writes 2 comments, Charlie writes 1 comment.
 * 4. Test: Filter by Alice's member_id - returns only her 3 comments.
 * 5. Test: Filter by Bob's member_id - returns only his 2 comments.
 * 6. Test: Filter by Charlie's member_id - returns only his 1 comment.
 * 7. Test: No filter returns all 6 comments.
 * 8. Test: Filter with sort_by - correctly sorts Alice's comments.
 * 9. Test: Filter with include_replies - works correctly.
 * 10. Test: Non-existent member_id returns empty results.
 */
export async function test_api_comment_list_member_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member Alice (target filter member)
  const aliceConnection: api.IConnection = { host: connection.host };
  const aliceAuth = await authorize_member_join(aliceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(aliceAuth);
  const aliceId: string = aliceAuth.id;
  const aliceUsername: string = aliceAuth.username;
  // 2. Setup: Create member Bob
  const bobConnection: api.IConnection = { host: connection.host };
  const bobAuth = await authorize_member_join(bobConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(bobAuth);
  const bobId: string = bobAuth.id;
  // 3. Setup: Create member Charlie
  const charlieConnection: api.IConnection = { host: connection.host };
  const charlieAuth = await authorize_member_join(charlieConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(charlieAuth);
  const charlieId: string = charlieAuth.id;
  // 4. Setup: Create a community for the post
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  // 5. Setup: Create a post that members can comment on
  const post = await generate_random_reddit_community_member_posts_create(
    aliceConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
      },
    },
  );
  typia.assert(post);
  const postId: string = post.id;
  // 6. Setup: Alice writes 3 comments on the post
  const aliceComments: IRedditCommunityComment[] = await Promise.all(
    ArrayUtil.repeat(3, () =>
      generate_random_reddit_community_member_posts_comments_create(
        aliceConnection,
        {
          body: {
            content: RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(),
              wordMin: 5,
              wordMax: 10,
            }),
          },
          params: { postId },
        },
      ),
    ),
  );
  typia.assert(aliceComments[0]!);
  typia.assert(aliceComments[1]!);
  typia.assert(aliceComments[2]!);
  // 7. Setup: Bob writes 2 comments on the post
  const bobComments: IRedditCommunityComment[] = await Promise.all(
    ArrayUtil.repeat(2, () =>
      generate_random_reddit_community_member_posts_comments_create(
        bobConnection,
        {
          body: {
            content: RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(),
              wordMin: 5,
              wordMax: 10,
            }),
          },
          params: { postId },
        },
      ),
    ),
  );
  typia.assert(bobComments[0]!);
  typia.assert(bobComments[1]!);
  // 8. Setup: Charlie writes 1 comment on the post
  const charlieComments: IRedditCommunityComment[] = await Promise.all(
    ArrayUtil.repeat(1, () =>
      generate_random_reddit_community_member_posts_comments_create(
        charlieConnection,
        {
          body: {
            content: RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(),
              wordMin: 5,
              wordMax: 10,
            }),
          },
          params: { postId },
        },
      ),
    ),
  );
  typia.assert(charlieComments[0]!);
  // 9. Test: Filter by Alice's member_id - should return only 3 comments
  const aliceFilteredResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: {
        member_id: aliceId,
      },
    });
  typia.assert(aliceFilteredResult);
  TestValidator.equals(
    "alice comments count",
    aliceFilteredResult.data.length,
    3,
  );
  TestValidator.equals(
    "alice pagination records",
    aliceFilteredResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "alice pagination pages",
    aliceFilteredResult.pagination.pages,
    1,
  );
  // 10. Validate: Each returned comment should have Alice as author
  for (const comment of aliceFilteredResult.data) {
    TestValidator.equals(
      `comment author matches alice (${comment.id})`,
      comment.author.id,
      aliceId,
    );
    TestValidator.equals(
      `comment author username matches alice (${comment.id})`,
      comment.author.username,
      aliceUsername,
    );
  }
  // 11. Test: Filter by Bob's member_id - should return only 2 comments
  const bobFilteredResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: {
        member_id: bobId,
      },
    });
  typia.assert(bobFilteredResult);
  TestValidator.equals("bob comments count", bobFilteredResult.data.length, 2);
  TestValidator.equals(
    "bob pagination records",
    bobFilteredResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "bob pagination pages",
    bobFilteredResult.pagination.pages,
    1,
  );
  // 12. Validate: Each returned comment should have Bob as author
  for (const comment of bobFilteredResult.data) {
    TestValidator.equals(
      `comment author matches bob (${comment.id})`,
      comment.author.id,
      bobId,
    );
  }
  // 13. Test: Filter by Charlie's member_id - should return only 1 comment
  const charlieFilteredResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: {
        member_id: charlieId,
      },
    });
  typia.assert(charlieFilteredResult);
  TestValidator.equals(
    "charlie comments count",
    charlieFilteredResult.data.length,
    1,
  );
  TestValidator.equals(
    "charlie pagination records",
    charlieFilteredResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "charlie pagination pages",
    charlieFilteredResult.pagination.pages,
    1,
  );
  // 14. Test: No filter - should return all 6 comments
  const allCommentsResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: {},
    });
  typia.assert(allCommentsResult);
  TestValidator.equals(
    "total comments count",
    allCommentsResult.data.length,
    6,
  );
  TestValidator.equals(
    "total pagination records",
    allCommentsResult.pagination.records,
    6,
  );
  // 15. Test: Filter by member_id with sort_by - Alice's comments should be sorted
  const aliceSortedResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: {
        member_id: aliceId,
        sort_by: "created_at",
        sort_order: "asc",
      },
    });
  typia.assert(aliceSortedResult);
  TestValidator.equals(
    "alice sorted comments count",
    aliceSortedResult.data.length,
    3,
  );
  // Validate sorting order (ascending by created_at)
  if (aliceSortedResult.data.length > 1) {
    for (let i = 1; i < aliceSortedResult.data.length; i++) {
      const prevCreatedAt = new Date(
        aliceSortedResult.data[i - 1].created_at,
      ).getTime();
      const currCreatedAt = new Date(
        aliceSortedResult.data[i].created_at,
      ).getTime();
      TestValidator.predicate(
        `comments sorted asc by created_at (${i - 1} to ${i})`,
        prevCreatedAt <= currCreatedAt,
      );
    }
  }
  // 16. Test: Filter by member_id with include_replies - should still work
  const aliceWithRepliesResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: {
        member_id: aliceId,
        include_replies: true,
      },
    });
  typia.assert(aliceWithRepliesResult);
  TestValidator.equals(
    "alice with replies count",
    aliceWithRepliesResult.data.length,
    3,
  );
  // 17. Test: Filter by non-existent member_id - should return empty results
  const nonExistentMemberId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: {
        member_id: nonExistentMemberId,
      },
    });
  typia.assert(nonExistentResult);
  TestValidator.equals(
    "non-existent comments count",
    nonExistentResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent pagination records",
    nonExistentResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent pagination pages",
    nonExistentResult.pagination.pages,
    0,
  );
}
