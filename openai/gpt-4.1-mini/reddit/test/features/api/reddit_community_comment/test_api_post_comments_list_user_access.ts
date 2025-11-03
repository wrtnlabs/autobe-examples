import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_post_comments_list_user_access(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "TestPass1234",
    ip: "127.0.0.1",
    href: "https://reddit.example.com",
    referrer: "https://redditreferrer.example.com",
  } satisfies IRedditCommunityUser.ICreate;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 2. Create a community
  // Use a unique community name with alphanumeric + random suffix
  const communityName = "testcommunity" + RandomGenerator.alphaNumeric(5);
  const communityCreateBody = {
    name: communityName,
    description: "A test community for e2e tests",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    title: "Test Post Title " + RandomGenerator.alphabets(10),
    body: "This is a test post body.",
    image_uri: null,
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Prepare comment listing request with pagination and filtering
  const commentRequest = {
    page: 1,
    limit: 10,
    search: undefined,
    sort: "created_at",
    order: "desc",
  } satisfies IRedditCommunityComment.IRequest;

  // 5. Fetch the paginated list of comments for the post
  const commentPage: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.user.communities.posts.comments.index(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: commentRequest,
      },
    );
  typia.assert(commentPage);

  // 6. Basic validations
  TestValidator.predicate(
    "pagination current page is positive",
    commentPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    commentPage.pagination.limit > 0 && commentPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    commentPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    commentPage.pagination.pages >= 0,
  );

  // Validate that all comments belong to the requested post
  for (const comment of commentPage.data) {
    typia.assert(comment);
    TestValidator.equals(
      "comment post_id matches requested post",
      comment.post_id,
      post.id,
    );
    // Validate that author has id and email
    typia.assert(comment.author);
    TestValidator.predicate(
      "author id is a uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[14][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        comment.author.id,
      ),
    );
    TestValidator.predicate(
      "author email contains @",
      comment.author.email.includes("@"),
    );
  }
}
