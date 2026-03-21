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

export async function test_api_user_comments_on_deleted_post_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberSession);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create first post (will be deleted)
  const postToDelete = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: `Post to Delete - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(postToDelete);
  // 4. Create second post (will remain active)
  const activePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: `Active Post - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(activePost);
  // 5. Create comment on post that will be deleted
  const commentOnDeletedPost =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: postToDelete.id },
        body: {
          content: `Comment on deleted post - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
  typia.assert(commentOnDeletedPost);
  // 6. Create comment on active post
  const commentOnActivePost =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: activePost.id },
        body: {
          content: `Comment on active post - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
  typia.assert(commentOnActivePost);
  // 7. Delete the first post
  await api.functional.redditClone.member.posts.erase(memberConnection, {
    postId: postToDelete.id,
  });
  // 8. Get user's comments
  const userComments =
    await api.functional.redditClone.member.users.comments.index(
      memberConnection,
      {
        username: memberSession.username,
        body: {
          sortBy: "new",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(userComments);
  // 9. Find both comments in the list
  const foundCommentOnDeletedPost = userComments.data.find(
    (c) => c.id === commentOnDeletedPost.id,
  );
  const foundCommentOnActivePost = userComments.data.find(
    (c) => c.id === commentOnActivePost.id,
  );
  // Validate: both comments should be present
  TestValidator.predicate(
    "comment on deleted post exists in user comments list",
    foundCommentOnDeletedPost !== undefined,
  );
  TestValidator.predicate(
    "comment on active post exists in user comments list",
    foundCommentOnActivePost !== undefined,
  );
  // Validate: total count should be 2
  TestValidator.equals(
    "pagination records count is 2",
    userComments.pagination.records,
    2,
  );
  // Validate: comment content remains visible
  if (foundCommentOnDeletedPost) {
    TestValidator.equals(
      "comment content is preserved",
      foundCommentOnDeletedPost.content,
      commentOnDeletedPost.content,
    );
  }
  if (foundCommentOnActivePost) {
    TestValidator.equals(
      "active comment content is preserved",
      foundCommentOnActivePost.content,
      commentOnActivePost.content,
    );
  }
  // Validate: active post comment has full post info including community
  if (foundCommentOnActivePost) {
    TestValidator.equals(
      "active post has title",
      foundCommentOnActivePost.post.title,
      activePost.title,
    );
    TestValidator.equals(
      "active post has community name",
      foundCommentOnActivePost.post.community.name,
      community.name,
    );
  }
  // Validate: deleted post comment has placeholder indicator (post id still exists but post info may be limited)
  // The key behavior is that the comment remains visible even though the post is deleted
  if (foundCommentOnDeletedPost) {
    TestValidator.predicate(
      "deleted post comment still has post reference",
      foundCommentOnDeletedPost.post !== undefined,
    );
  }
}
