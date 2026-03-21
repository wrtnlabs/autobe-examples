import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

/**
 * Test that a member can view another user's comment history and only sees active comments.
 *
 * Setup:
 * 1. Authenticate as member1 and create a community and post
 * 2. Create a comment as member1
 * 3. Authenticate as member2 using /redditClone/auth/member/join
 * 4. Create another comment on the same post as member2
 * 5. Delete member1's comment using /redditClone/member/comments/{commentId}
 *
 * Test:
 * 1. As member2, call GET /redditClone/member/users/{username}/comments with username=member1
 * 2. Verify response shows only member2's comment (member1's deleted comment should not appear)
 * 3. Verify member2's own comments are NOT in member1's history
 * 4. Sort by different options: best, new, controversial
 * 5. Test pagination with limit parameter
 */
export async function test_api_user_comments_view_other_user_active_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // 2. Create a community and post as member1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 3. Create a comment as member1
  const member1Comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(member1Comment);
  // 4. Authenticate as member2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 5. Create another comment on the same post as member2
  const member2Comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      member2Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(member2Comment);
  // 6. Delete member1's comment
  await api.functional.redditClone.member.comments.erase(member1Connection, {
    commentId: member1Comment.id,
  });
  // Test: As member2, view member1's comments - should NOT see deleted comment
  const member1CommentsAsMember2 =
    await api.functional.redditClone.member.users.comments.index(
      member2Connection,
      {
        username: member1.username,
        body: {
          sortBy: "best",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(member1CommentsAsMember2);
  // Verify member1's deleted comment is NOT visible to member2
  TestValidator.equals(
    "member1's deleted comment not visible to other users",
    member1CommentsAsMember2.data.some((c) => c.id === member1Comment.id),
    false,
  );
  // Verify member2's own comments are NOT in member1's history
  TestValidator.equals(
    "member2's comment not in member1's history",
    member1CommentsAsMember2.data.some((c) => c.id === member2Comment.id),
    false,
  );
  // Test sorting options
  for (const sortBy of ["best", "new", "controversial"] as const) {
    const sortedComments =
      await api.functional.redditClone.member.users.comments.index(
        member2Connection,
        {
          username: member1.username,
          body: {
            sortBy,
            page: 1,
            limit: 20,
          },
        },
      );
    typia.assert(sortedComments);
    // Should have no comments since member1's only comment was deleted
    TestValidator.equals(
      `sortBy=${sortBy}: no deleted comments visible`,
      sortedComments.data.length,
      0,
    );
  }
  // Test pagination with limit parameter
  const paginatedComments =
    await api.functional.redditClone.member.users.comments.index(
      member2Connection,
      {
        username: member1.username,
        body: {
          sortBy: "new",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedComments);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedComments.pagination.limit === 5,
  );
  TestValidator.predicate(
    "empty data for deleted user comments",
    paginatedComments.data.length === 0,
  );
}
