import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityMember.IJoin;
  const authorized: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: joinInput });
  typia.assert(authorized);
  // Create a new connection with the token for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 2. Create a community ID for post creation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a post with no comments
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(
      authenticatedConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_id: communityId,
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 4. Test edge case: post with zero comments
  const zeroCommentsResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      authenticatedConnection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(zeroCommentsResponse);
  TestValidator.equals(
    "zero comments - data array empty",
    zeroCommentsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "zero comments - records",
    zeroCommentsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero comments - pages",
    zeroCommentsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "zero comments - limit default",
    zeroCommentsResponse.pagination.limit,
    20,
  );
  // 5. Test navigating to page beyond total pages (still zero comments)
  const beyondPageResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      authenticatedConnection,
      {
        postId: post.id,
        body: {
          page: 100,
          limit: 10,
        },
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond total pages - data array empty",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond total pages - records",
    beyondPageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond total pages - pages",
    beyondPageResponse.pagination.pages,
    0,
  );
  // 6. Test pagination with explicit limit values on zero-comments post
  const paginationTests = [10, 25, 100];
  for (const limit of paginationTests) {
    const response =
      await api.functional.redditCommunity.member.posts.comments.index(
        authenticatedConnection,
        {
          postId: post.id,
          body: {
            limit: limit,
          },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "pagination limit " + limit + " - limit metadata",
      response.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "pagination limit " + limit + " - records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination limit " + limit + " - pages",
      response.pagination.pages,
      0,
    );
    TestValidator.equals(
      "pagination limit " + limit + " - data array empty",
      response.data.length,
      0,
    );
  }
  // 7. Test sorting options on zero-comments post
  const sortOptions: Array<"best" | "new" | "controversial"> = [
    "best",
    "new",
    "controversial",
  ];
  for (const sort of sortOptions) {
    const response =
      await api.functional.redditCommunity.member.posts.comments.index(
        authenticatedConnection,
        {
          postId: post.id,
          body: {
            sort: sort,
          },
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "sort " + sort + " - data array empty",
      response.data.length,
      0,
    );
  }
}
