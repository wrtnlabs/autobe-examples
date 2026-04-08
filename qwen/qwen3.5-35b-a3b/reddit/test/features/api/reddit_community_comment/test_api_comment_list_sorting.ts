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

export async function test_api_comment_list_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // Create new connection for authenticated member operations
  const memberApiConnection: api.IConnection = { host: connection.host };
  memberApiConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  // Create second member for comment diversity
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Authorized);
  // Create new connection for second authenticated member
  const member2ApiConnection: api.IConnection = { host: connection.host };
  member2ApiConnection.headers = {
    Authorization: member2Authorized.token.access,
  };
  // 2. Create post with generated UUID for community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberApiConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create comments with different timestamps and votes
  const comments: IRedditCommunityComment[] = [];
  // First batch of comments with member1
  for (let i = 0; i < 3; i++) {
    const comment =
      await api.functional.redditCommunity.member.posts.comments.create(
        memberApiConnection,
        {
          postId: post.id,
          body: {
            content: `Comment ${i + 1} by ${memberAuthorized.username}`,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Second batch of comments with member2 (should have different author)
  for (let i = 0; i < 3; i++) {
    const comment =
      await api.functional.redditCommunity.member.posts.comments.create(
        member2ApiConnection,
        {
          postId: post.id,
          body: {
            content: `Comment ${i + 4} by ${member2Authorized.username}`,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  TestValidator.equals("total comments created", comments.length, 6);
  // 4. Test sorting by created_at DESC (default)
  let sortedComments =
    await api.functional.redditCommunity.posts.comments.index(
      memberApiConnection,
      {
        postId: post.id,
        body: {
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(sortedComments);
  TestValidator.equals(
    "default sort order",
    sortedComments.pagination.records,
    6,
  );
  // Verify comments are in DESC order (newest first)
  for (let i = 0; i < sortedComments.data.length - 1; i++) {
    const current = sortedComments.data[i];
    const next = sortedComments.data[i + 1];
    TestValidator.predicate(
      `created_at DESC: comment ${i} is newer than ${i + 1}`,
      new Date(current.created_at) >= new Date(next.created_at),
    );
  }
  // 5. Test sorting by created_at ASC (oldest first)
  sortedComments = await api.functional.redditCommunity.posts.comments.index(
    memberApiConnection,
    {
      postId: post.id,
      body: {
        sort_by: "created_at" as const,
        sort_order: "asc" as const,
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(sortedComments);
  // Verify comments are in ASC order (oldest first)
  for (let i = 0; i < sortedComments.data.length - 1; i++) {
    const current = sortedComments.data[i];
    const next = sortedComments.data[i + 1];
    TestValidator.predicate(
      `created_at ASC: comment ${i} is older than ${i + 1}`,
      new Date(current.created_at) <= new Date(next.created_at),
    );
  }
  // 6. Test sorting by vote_count DESC (highest votes first)
  sortedComments = await api.functional.redditCommunity.posts.comments.index(
    memberApiConnection,
    {
      postId: post.id,
      body: {
        sort_by: "vote_count" as const,
        sort_order: "desc" as const,
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(sortedComments);
  // Verify comments are in vote_count DESC order
  for (let i = 0; i < sortedComments.data.length - 1; i++) {
    const current = sortedComments.data[i];
    const next = sortedComments.data[i + 1];
    TestValidator.predicate(
      `vote_count DESC: comment ${i} has >= votes than ${i + 1}`,
      current.vote_count >= next.vote_count,
    );
  }
  // 7. Test sorting by vote_count ASC (lowest votes first)
  sortedComments = await api.functional.redditCommunity.posts.comments.index(
    memberApiConnection,
    {
      postId: post.id,
      body: {
        sort_by: "vote_count" as const,
        sort_order: "asc" as const,
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(sortedComments);
  // Verify comments are in vote_count ASC order
  for (let i = 0; i < sortedComments.data.length - 1; i++) {
    const current = sortedComments.data[i];
    const next = sortedComments.data[i + 1];
    TestValidator.predicate(
      `vote_count ASC: comment ${i} has <= votes than ${i + 1}`,
      current.vote_count <= next.vote_count,
    );
  }
  // 8. Test sorting by updated_at
  sortedComments = await api.functional.redditCommunity.posts.comments.index(
    memberApiConnection,
    {
      postId: post.id,
      body: {
        sort_by: "updated_at" as const,
        sort_order: "desc" as const,
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(sortedComments);
  // Verify comments are in updated_at DESC order
  for (let i = 0; i < sortedComments.data.length - 1; i++) {
    const current = sortedComments.data[i];
    const next = sortedComments.data[i + 1];
    TestValidator.predicate(
      `updated_at DESC: comment ${i} is updated >= than ${i + 1}`,
      new Date(current.updated_at) >= new Date(next.updated_at),
    );
  }
  // 9. Validate pagination metadata is accurate
  TestValidator.equals(
    "pagination records count",
    sortedComments.pagination.records,
    6,
  );
  TestValidator.equals(
    "pagination pages count",
    sortedComments.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    sortedComments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sortedComments.pagination.limit, 10);
}
