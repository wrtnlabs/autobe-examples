import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_admin_search_content_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: ("admin" +
        RandomGenerator.alphaNumeric(5) +
        "@test.com") satisfies string &
        tags.MinLength<1> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    },
  });
  // 2. Create multiple member users
  const memberCount = 3;
  const memberConnections: api.IConnection[] = [];
  const members: IRedditLikeMember.IAuthorized[] = [];
  for (let i = 0; i < memberCount; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: ("member" +
          RandomGenerator.alphaNumeric(5) +
          "@test.com") satisfies string &
          tags.MinLength<1> &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      },
    });
    memberConnections.push(memberConnection);
    members.push(member);
  }
  // 3. Skip community creation - API not available in this scope
  // Create mock community IDs for testing (using random UUIDs as placeholders)
  const communities: IRedditLikeCommunity.ISummary[] = [];
  for (let i = 0; i < 2; i++) {
    communities.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.alphaNumeric(8),
      created_at: new Date().toISOString(),
    });
  }
  // 4. Create posts across communities by different member authors
  const postCount = 6;
  const posts: IRedditLikePost[] = [];
  for (let i = 0; i < postCount; i++) {
    const post = await api.functional.redditLike.member.posts.create(
      memberConnections[i % 3],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "text" as const,
          content: RandomGenerator.paragraph({ sentences: 2 }),
          community_id: communities[i % 2].id,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 5. Create comments on posts by different member authors
  const commentCount = 4;
  const comments: IRedditLikeComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await api.functional.redditLike.member.posts.comments.create(
        memberConnections[i % 3],
        {
          postId: posts[i % 2].id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 6. Test search with community_id filter
  const searchByCommunity =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          community_id: communities[0].id,
        },
      },
    );
  typia.assert(searchByCommunity);
  for (const item of searchByCommunity.data) {
    TestValidator.equals(
      "community_id filter entity_type",
      item.entity_type,
      "community" as const,
    );
  }
  // 7. Test search with author_id filter (using member ID)
  const authorId = members[0].id;
  const searchByAuthor =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          author_id: authorId,
        },
      },
    );
  typia.assert(searchByAuthor);
  for (const item of searchByAuthor.data) {
    TestValidator.equals("author_id filter", item.id, authorId);
  }
  // 8. Test search with type filter "post"
  const searchPostType =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          type: "post" as const,
        },
      },
    );
  typia.assert(searchPostType);
  for (const item of searchPostType.data) {
    TestValidator.equals("type filter post", item.entity_type, "post" as const);
  }
  // 9. Test search with type filter "comment"
  const searchCommentType =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          type: "comment" as const,
        },
      },
    );
  typia.assert(searchCommentType);
  for (const item of searchCommentType.data) {
    TestValidator.equals(
      "type filter comment",
      item.entity_type,
      "comment" as const,
    );
  }
  // 10. Test search with type filter "community"
  const searchCommunityType =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          type: "community" as const,
        },
      },
    );
  typia.assert(searchCommunityType);
  for (const item of searchCommunityType.data) {
    TestValidator.equals(
      "type filter community",
      item.entity_type,
      "community" as const,
    );
  }
  // 11. Test limit parameter (min)
  const searchMinLimit =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(searchMinLimit);
  TestValidator.equals(
    "limit min check",
    searchMinLimit.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit min",
    searchMinLimit.pagination.limit,
    1,
  );
  // 12. Test limit parameter (max)
  const searchMaxLimit =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(searchMaxLimit);
  TestValidator.equals(
    "limit max check",
    searchMaxLimit.data.length <= 100,
    true,
  );
  TestValidator.equals(
    "pagination limit max",
    searchMaxLimit.pagination.limit,
    100,
  );
  // 13. Test page parameter (page=1)
  const searchPageOne =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(searchPageOne);
  TestValidator.equals("page one", searchPageOne.pagination.current, 1);
  // 14. Test page parameter (beyond range)
  const searchPageBeyond =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          page: 999 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(searchPageBeyond);
  TestValidator.equals(
    "page beyond range data",
    searchPageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond range pagination current",
    searchPageBeyond.pagination.current,
    999,
  );
  TestValidator.equals(
    "page beyond range pagination records",
    searchPageBeyond.pagination.records,
    0,
  );
  // 15. Test combined filters
  const searchCombined =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          community_id: communities[0].id,
          author_id: authorId,
          type: "post" as const,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(searchCombined);
  for (const item of searchCombined.data) {
    TestValidator.equals(
      "combined entity_type",
      item.entity_type,
      "post" as const,
    );
  }
}
