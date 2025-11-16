import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test creating a link post with maximum URL length.
 *
 * This test validates that the platform properly handles link posts with URLs
 * approaching the maximum 2,000 character limit. The test ensures that:
 *
 * 1. Long URLs with extensive query parameters are accepted
 * 2. URLs are stored exactly as provided without truncation
 * 3. URI format validation accepts lengthy but valid URLs
 *
 * Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Create test community
 * 3. Create and authenticate member account
 * 4. Generate valid long URL (~1,900-2,000 characters)
 * 5. Create link post with maximum length URL
 * 6. Validate URL is stored exactly as provided
 */
export async function test_api_post_creation_url_maximum_length(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(15),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphabets(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  const baseUrl = "https://example.com/article";
  const queryParams: string[] = [];
  let currentLength = baseUrl.length + 1;

  while (currentLength < 1950) {
    const paramName = `param${queryParams.length}`;
    const paramValue = RandomGenerator.alphaNumeric(50);
    const paramString = `${paramName}=${paramValue}`;

    if (currentLength + paramString.length + 1 > 1990) {
      const remainingLength = 1990 - currentLength - paramName.length - 2;
      if (remainingLength > 10) {
        const finalValue = RandomGenerator.alphaNumeric(remainingLength);
        queryParams.push(`${paramName}=${finalValue}`);
      }
      break;
    }

    queryParams.push(paramString);
    currentLength += paramString.length + 1;
  }

  const longUrl = `${baseUrl}?${queryParams.join("&")}`;

  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 5,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "link",
        body: null,
        url: longUrl,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  TestValidator.predicate(
    "URL length should be close to maximum (1900-2000 characters)",
    longUrl.length >= 1900 && longUrl.length <= 2000,
  );

  TestValidator.equals(
    "Post URL should match the submitted long URL exactly",
    post.url,
    longUrl,
  );

  TestValidator.equals("Post type should be link", post.post_type, "link");

  TestValidator.equals(
    "Post title should match submitted title",
    post.title,
    postTitle,
  );

  TestValidator.equals(
    "Post community_id should match created community",
    post.community_id,
    community.id,
  );

  TestValidator.equals(
    "Post member_id should match authenticated member",
    post.member_id,
    member.id,
  );

  TestValidator.predicate(
    "Post body should be null for link posts",
    post.body === null || post.body === undefined,
  );

  TestValidator.predicate(
    "Post image_url should be null for link posts",
    post.image_url === null || post.image_url === undefined,
  );
}
