import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostImage";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * This scenario tests the search and retrieval of post images for a specific
 * reddit community post. A new registeredUser is created using the
 * /auth/registeredUser/join operation to authenticate. Next, a reddit community
 * is created followed by a new post within that community, both to prepare the
 * necessary data context. Then, the search operation is invoked to retrieve the
 * paginated list of post images for the created post. The scenario validates
 * the proper access control for registered users and correct pagination and
 * filtering of post images.
 */
export async function test_api_reddit_community_registered_user_post_images_search_with_valid_authentication(
  connection: api.IConnection,
) {
  // 1. RegisteredUser joins (sign up and authentication)
  const email: string = `user${RandomGenerator.alphaNumeric(6)}@example.com`;
  const authenticatedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: email,
        password: "StrongPassword123!",
        ip: null,
        href: "https://reddit.example.com/signup",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(authenticatedUser);

  // 2. Create a new reddit community
  const communityName: string = `community_${RandomGenerator.alphaNumeric(6)}`;
  const description: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const communityBody = {
    communityName: communityName,
    description: description,
    status: "active" as const,
  } satisfies IRedditCommunityCommunity.ICreate;
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Create a new post within the community
  // Post type can be "image" as we are testing post images retrieval
  const postBody = {
    community_code: createdCommunity.communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    type: "image" as const,
    content: null,
  } satisfies IRedditCommunityPost.ICreate;
  const createdPost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(createdPost);

  // 4. Search for post images linked to the created post, using index API
  // Use default pagination (page 1, limit 10) and no filters
  const searchRequestBody = {
    postId: createdPost.id,
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    order: "asc",
  } satisfies IRedditCommunityPostImage.IRequest;
  const searchResult: IPageIRedditCommunityPostImage.ISummary =
    await api.functional.redditCommunity.registeredUser.posts.postImages.index(
      connection,
      {
        postId: createdPost.id,
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page equals 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination item count is <= 10",
    searchResult.data.length <= 10,
  );

  // 6. Validate each item in data
  for (const image of searchResult.data) {
    typia.assert(image);
    TestValidator.equals(
      "image post_id must match created post id",
      image.post_id,
      createdPost.id,
    );
    TestValidator.predicate("image order must be positive", image.order >= 0);
    TestValidator.predicate(
      "image width and height must be positive",
      image.width > 0 && image.height > 0,
    );
    TestValidator.predicate(
      "image url is uri format",
      typeof image.url === "string" && image.url.length > 0,
    );
  }
}
