import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_post_creation_in_community_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a text post
  const textPostBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 7,
    }).slice(0, 300),
    body_text: RandomGenerator.content({ paragraphs: 2 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPosts.ICreate;
  const textPost: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: textPostBody,
      },
    );
  typia.assert(textPost);
  TestValidator.equals("text post type", textPost.post_type, "text");
  TestValidator.equals(
    "text post community id",
    textPost.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "text post title length <= 300",
    textPost.title.length <= 300,
  );
  TestValidator.predicate(
    "text post body_text not empty",
    typeof textPost.body_text === "string" && textPost.body_text.length > 0,
  );
  TestValidator.equals("text post link_url is null", textPost.link_url, null);
  TestValidator.equals("text post image_url is null", textPost.image_url, null);

  // 4. Create a link post
  const linkPostBody = {
    reddit_community_community_id: community.id,
    post_type: "link",
    title: RandomGenerator.paragraph({ sentences: 6 }).slice(0, 300),
    body_text: null,
    link_url: "https://" + RandomGenerator.alphabets(10) + ".com",
    image_url: null,
  } satisfies IRedditCommunityPosts.ICreate;
  const linkPost: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: linkPostBody,
      },
    );
  typia.assert(linkPost);
  TestValidator.equals("link post type", linkPost.post_type, "link");
  TestValidator.equals(
    "link post community id",
    linkPost.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "link post title length <= 300",
    linkPost.title.length <= 300,
  );
  TestValidator.equals("link post body_text is null", linkPost.body_text, null);
  TestValidator.predicate(
    "link post link_url starts with http",
    linkPost.link_url?.startsWith("http") ?? false,
  );
  TestValidator.equals("link post image_url is null", linkPost.image_url, null);

  // 5. Create an image post
  const imagePostBody = {
    reddit_community_community_id: community.id,
    post_type: "image",
    title: RandomGenerator.paragraph({ sentences: 5 }).slice(0, 300),
    body_text: null,
    link_url: null,
    image_url:
      "https://images.example.com/" + RandomGenerator.alphaNumeric(12) + ".png",
  } satisfies IRedditCommunityPosts.ICreate;
  const imagePost: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: imagePostBody,
      },
    );
  typia.assert(imagePost);
  TestValidator.equals("image post type", imagePost.post_type, "image");
  TestValidator.equals(
    "image post community id",
    imagePost.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "image post title length <= 300",
    imagePost.title.length <= 300,
  );
  TestValidator.equals(
    "image post body_text is null",
    imagePost.body_text,
    null,
  );
  TestValidator.equals("image post link_url is null", imagePost.link_url, null);
  TestValidator.predicate(
    "image post image_url starts with https",
    imagePost.image_url?.startsWith("https") ?? false,
  );

  // 6. Unauthorized (no auth) post creation attempt should fail
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot create post",
    async () => {
      await api.functional.redditCommunity.member.communities.posts.createPost(
        unauthConnection,
        {
          communityId: community.id,
          body: textPostBody,
        },
      );
    },
  );

  // 7. Invalid content scenarios
  // Missing required title
  await TestValidator.error("post creation fails missing title", async () => {
    const invalidBody = {
      reddit_community_community_id: community.id,
      post_type: "text",
      title: "",
      body_text: "Some body",
      link_url: null,
      image_url: null,
    } satisfies IRedditCommunityPosts.ICreate;
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: invalidBody,
      },
    );
  });

  // Title length exceeds maximum
  await TestValidator.error("post creation fails title too long", async () => {
    const tooLongTitle = RandomGenerator.alphabets(310);
    const invalidBody = {
      reddit_community_community_id: community.id,
      post_type: "text",
      title: tooLongTitle,
      body_text: "Valid body",
      link_url: null,
      image_url: null,
    } satisfies IRedditCommunityPosts.ICreate;
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: invalidBody,
      },
    );
  });

  // Link post with invalid URL
  await TestValidator.error(
    "post creation fails invalid link_url",
    async () => {
      const invalidBody = {
        reddit_community_community_id: community.id,
        post_type: "link",
        title: "Valid title",
        body_text: null,
        link_url: "not-a-url",
        image_url: null,
      } satisfies IRedditCommunityPosts.ICreate;
      await api.functional.redditCommunity.member.communities.posts.createPost(
        connection,
        {
          communityId: community.id,
          body: invalidBody,
        },
      );
    },
  );

  // Image post with invalid URL
  await TestValidator.error(
    "post creation fails invalid image_url",
    async () => {
      const invalidBody = {
        reddit_community_community_id: community.id,
        post_type: "image",
        title: "Valid title",
        body_text: null,
        link_url: null,
        image_url: "ftp://bad-url",
      } satisfies IRedditCommunityPosts.ICreate;
      await api.functional.redditCommunity.member.communities.posts.createPost(
        connection,
        {
          communityId: community.id,
          body: invalidBody,
        },
      );
    },
  );
}
