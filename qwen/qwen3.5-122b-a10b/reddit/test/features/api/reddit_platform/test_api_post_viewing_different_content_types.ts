import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_viewing_different_content_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community (owner auto-subscribes, but we'll explicitly subscribe to test)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create text post
  const textPost = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  // 5. Create link post
  const linkPost = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "link",
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 6. Create image post - need to create a file first
  // Since we don't have a file upload utility, we'll use a placeholder file_id
  // This would normally require file upload first
  const imagePost = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "image",
        file_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 7. View text post and verify
  const viewedTextPost = await api.functional.redditPlatform.posts.at(
    connection,
    {
      postId: textPost.id,
    },
  );
  typia.assert(viewedTextPost);
  TestValidator.equals(
    "text post title exists",
    viewedTextPost.title,
    textPost.title,
  );
  TestValidator.predicate(
    "text post has text_content",
    viewedTextPost.text_content !== null,
  );
  TestValidator.equals("text post url is null", viewedTextPost.url, null);
  TestValidator.equals("text post file is null", viewedTextPost.file, null);
  TestValidator.predicate(
    "text post has author",
    viewedTextPost.author !== undefined,
  );
  TestValidator.predicate(
    "text post has community",
    viewedTextPost.community !== undefined,
  );
  TestValidator.predicate(
    "text post has vote_score",
    typeof viewedTextPost.vote_score === "number",
  );
  TestValidator.predicate(
    "text post has comment_count",
    typeof viewedTextPost.comment_count === "number",
  );
  // 8. View link post and verify
  const viewedLinkPost = await api.functional.redditPlatform.posts.at(
    connection,
    {
      postId: linkPost.id,
    },
  );
  typia.assert(viewedLinkPost);
  TestValidator.equals(
    "link post title exists",
    viewedLinkPost.title,
    linkPost.title,
  );
  TestValidator.predicate("link post has url", viewedLinkPost.url !== null);
  TestValidator.equals(
    "link post text_content is null",
    viewedLinkPost.text_content,
    null,
  );
  TestValidator.equals("link post file is null", viewedLinkPost.file, null);
  TestValidator.predicate(
    "link post has author",
    viewedLinkPost.author !== undefined,
  );
  TestValidator.predicate(
    "link post has community",
    viewedLinkPost.community !== undefined,
  );
  TestValidator.predicate(
    "link post has vote_score",
    typeof viewedLinkPost.vote_score === "number",
  );
  TestValidator.predicate(
    "link post has comment_count",
    typeof viewedLinkPost.comment_count === "number",
  );
  // 9. View image post and verify
  const viewedImagePost = await api.functional.redditPlatform.posts.at(
    connection,
    {
      postId: imagePost.id,
    },
  );
  typia.assert(viewedImagePost);
  TestValidator.equals(
    "image post title exists",
    viewedImagePost.title,
    imagePost.title,
  );
  TestValidator.predicate(
    "image post has file",
    viewedImagePost.file !== null && viewedImagePost.file !== undefined,
  );
  TestValidator.equals(
    "image post text_content is null",
    viewedImagePost.text_content,
    null,
  );
  TestValidator.equals("image post url is null", viewedImagePost.url, null);
  TestValidator.predicate(
    "image post has author",
    viewedImagePost.author !== undefined,
  );
  TestValidator.predicate(
    "image post has community",
    viewedImagePost.community !== undefined,
  );
  TestValidator.predicate(
    "image post has vote_score",
    typeof viewedImagePost.vote_score === "number",
  );
  TestValidator.predicate(
    "image post has comment_count",
    typeof viewedImagePost.comment_count === "number",
  );
}