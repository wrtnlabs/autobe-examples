import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Validates that comment vote totals endpoint returns 404 Not Found for soft-deleted comments.
 *
 * This test validates the complete deletion flow for comment vote totals retrieval, ensuring that deleted comments are properly rejected with HTTP 404 status rather than returning zero vote totals. The test creates a community, post, and comment through authenticated member sessions, then verifies that attempting to retrieve vote totals for the deleted comment returns the appropriate error response.
 *
 * The implementation follows strict connection isolation with separate connections for each member actor, ensuring proper authentication and authorization boundaries throughout the test execution.
 *
 * 1. Member 1 authenticates and creates a community and post.
 * 2. Member 2 authenticates and creates a comment on the post.
 * 3. Verify the active comment returns valid vote totals.
 * 4. Member 2 deletes the comment.
 * 5. Attempt to retrieve vote totals for the deleted comment.
 * 6. Verify HTTP 404 Not Found is returned for the deleted comment.
 */
export async function test_api_comment_vote_totals_deleted_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member to own community and post
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create second member to cast votes
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 3. Create community with member1
  const community =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(community);
  // 4. Create post in community with member1
  const post = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on post with member2
  const comment = await generate_random_reddit_platform_member_comments_create(
    member2Connection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(comment);
  // 6. Verify active comment returns valid vote totals
  const activeVoteTotals =
    await api.functional.redditPlatform.member.comments.votes.totals(
      member2Connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(activeVoteTotals);
  TestValidator.equals("vote totals initialized", activeVoteTotals.score, 0);
  // 7. Delete the comment
  await api.functional.redditPlatform.member.comments.erase(member2Connection, {
    commentId: comment.id,
  });
  // 8. Verify vote totals endpoint returns 404 for deleted comment
  await TestValidator.httpError(
    "deleted comment returns 404",
    [404],
    async () => {
      await api.functional.redditPlatform.member.comments.votes.totals(
        member2Connection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
