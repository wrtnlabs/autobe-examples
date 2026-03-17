import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_post_update_text_content_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate community ID for test (since no community management API available)
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create text post
  const textPostTitle = RandomGenerator.paragraph({ sentences: 3 });
  const textPostBody = RandomGenerator.paragraph({ sentences: 5 });
  const textPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: textPostTitle,
        post_type: "text" as const,
        body: textPostBody,
        community_id: testCommunityId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals("text post type", textPost.post_type, "text");
  typia.assert(textPost.content);
  if (textPost.content.post_type === "text") {
    TestValidator.equals(
      "text post initial body",
      textPost.content.body,
      textPostBody,
    );
  }
  const textPostCreatedAt = textPost.updated_at;
  // 4. Update text post with new title and body
  const newTextPostTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newTextPostBody = RandomGenerator.paragraph({ sentences: 4 });
  const textPostUpdate =
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId: textPost.id,
      body: {
        title: newTextPostTitle,
        text_post_body: newTextPostBody,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(textPostUpdate);
  TestValidator.equals(
    "text post updated title",
    textPostUpdate.title,
    newTextPostTitle,
  );
  TestValidator.equals(
    "text post body is text type",
    textPostUpdate.content.post_type,
    "text",
  );
  if (textPostUpdate.content.post_type === "text") {
    TestValidator.equals(
      "text post body updated",
      textPostUpdate.content.body,
      newTextPostBody,
    );
  }
  TestValidator.notEquals(
    "text post updated_at refreshed",
    textPostCreatedAt,
    textPostUpdate.updated_at,
  );
  // 5. Create link post
  const linkPostTitle = RandomGenerator.paragraph({ sentences: 2 });
  const linkPostUrl = typia.random<string & tags.Format<"url">>();
  const linkPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: linkPostTitle,
        post_type: "link" as const,
        url: linkPostUrl,
        community_id: testCommunityId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post type", linkPost.post_type, "link");
  typia.assert(linkPost.content);
  TestValidator.equals(
    "link post initial title",
    linkPost.title,
    linkPostTitle,
  );
  if (linkPost.content.post_type === "link") {
    const linkUrlConverted = linkPostUrl satisfies string &
      tags.Format<"url"> as string & tags.Format<"uri">;
    TestValidator.equals(
      "link post initial url",
      linkPost.content.url,
      linkUrlConverted,
    );
  }
  if (linkPost.content.post_type === "link") {
    TestValidator.predicate(
      "link post has domain name",
      !!linkPost.content.domain_name,
    );
  }
  const linkPostCreatedAt = linkPost.updated_at;
  // 6. Update link post with new title and URL
  const newLinkPostTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newLinkPostUrl = typia.random<string & tags.Format<"url">>();
  const newLinkPostUrlUri = newLinkPostUrl satisfies string &
    tags.Format<"url"> as string & tags.Format<"uri">;
  const linkPostUpdate =
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId: linkPost.id,
      body: {
        title: newLinkPostTitle,
        link_post_url: newLinkPostUrlUri,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(linkPostUpdate);
  TestValidator.equals(
    "link post updated title",
    linkPostUpdate.title,
    newLinkPostTitle,
  );
  TestValidator.equals(
    "link post url is link type",
    linkPostUpdate.content.post_type,
    "link",
  );
  if (linkPostUpdate.content.post_type === "link") {
    TestValidator.equals(
      "link post URL updated",
      linkPostUpdate.content.url,
      newLinkPostUrlUri,
    );
  }
  TestValidator.notEquals(
    "link post updated_at refreshed",
    linkPostCreatedAt,
    linkPostUpdate.updated_at,
  );
  // 7. Create image post
  const imagePostTitle = RandomGenerator.paragraph({ sentences: 2 });
  const imageFileId = typia.random<string & tags.Format<"uuid">>();
  const imagePost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: imagePostTitle,
        post_type: "image" as const,
        fileId: imageFileId,
        community_id: testCommunityId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  TestValidator.equals("image post type", imagePost.post_type, "image");
  typia.assert(imagePost.content);
  TestValidator.equals(
    "image post initial title",
    imagePost.title,
    imagePostTitle,
  );
  if (imagePost.content.post_type === "image") {
    TestValidator.equals(
      "image post initial fileUri",
      imagePost.content.fileUri,
      imageFileId satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uri">,
    );
  }
  const imagePostCreatedAt = imagePost.updated_at;
  // 8. Update image post with new title and image_id
  const newImagePostTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newImageFileId = typia.random<string & tags.Format<"uuid">>();
  const imagePostUpdate =
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId: imagePost.id,
      body: {
        title: newImagePostTitle,
        image_id: newImageFileId,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(imagePostUpdate);
  TestValidator.equals(
    "image post updated title",
    imagePostUpdate.title,
    newImagePostTitle,
  );
  TestValidator.equals(
    "image post fileUri is image type",
    imagePostUpdate.content.post_type,
    "image",
  );
  if (imagePostUpdate.content.post_type === "image") {
    TestValidator.equals(
      "image post fileUri updated",
      imagePostUpdate.content.fileUri,
      newImageFileId satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uri">,
    );
  }
  TestValidator.notEquals(
    "image post updated_at refreshed",
    imagePostCreatedAt,
    imagePostUpdate.updated_at,
  );
  // 9. Validate content field isolation - updating one type doesn't affect others
  // Re-fetch text post to ensure link fields weren't affected
  const textPostAfterLinkUpdate =
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId: textPost.id,
      body: {
        title: newTextPostTitle,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(textPostAfterLinkUpdate);
  if (textPostAfterLinkUpdate.content.post_type === "text") {
    TestValidator.equals(
      "text post body unchanged after link update attempt",
      textPostAfterLinkUpdate.content.body,
      newTextPostBody,
    );
  }
}
