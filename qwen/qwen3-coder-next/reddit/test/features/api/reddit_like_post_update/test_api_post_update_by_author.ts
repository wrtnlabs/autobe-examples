import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IRedditLikeMember.IJoin>();
  const authorized = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authorized);
  // Since there's no post creation API available, we'll test the update endpoint
  // with a randomly generated postId (in a real scenario, this would be an existing post)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Test text post update
  const textPostBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "text" as const,
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.IUpdate;
  const updatedTextPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId,
      body: textPostBody,
    },
  );
  typia.assert(updatedTextPost);
  // Step 3: Verify text post update
  TestValidator.equals(
    "text post title matches updated title",
    updatedTextPost.title,
    textPostBody.title,
  );
  TestValidator.equals(
    "text post content matches updated content",
    updatedTextPost.content,
    textPostBody.content,
  );
  TestValidator.equals("text post type matches", updatedTextPost.type, "text");
  // Step 4: Test link post update
  const linkUrl = `https://example.com/${RandomGenerator.alphabets(8)}.html`;
  const linkPostBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "link" as const,
    url: linkUrl,
  } satisfies IRedditLikePost.IUpdate;
  const updatedLinkPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId,
      body: linkPostBody,
    },
  );
  typia.assert(updatedLinkPost);
  // Step 5: Verify link post update
  TestValidator.equals(
    "link post title matches updated title",
    updatedLinkPost.title,
    linkPostBody.title,
  );
  TestValidator.equals(
    "link post url matches updated url",
    updatedLinkPost.url,
    linkPostBody.url,
  );
  TestValidator.equals("link post type matches", updatedLinkPost.type, "link");
  // Step 6: Test image post update
  const imageUrl = `https://example.com/image-${RandomGenerator.alphabets(8)}.jpg`;
  const imagePostBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "image" as const,
    image_url: imageUrl,
  } satisfies IRedditLikePost.IUpdate;
  const updatedImagePost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId,
      body: imagePostBody,
    },
  );
  typia.assert(updatedImagePost);
  // Step 7: Verify image post update
  TestValidator.equals(
    "image post title matches updated title",
    updatedImagePost.title,
    imagePostBody.title,
  );
  TestValidator.equals(
    "image post image_url matches updated image_url",
    updatedImagePost.image_url,
    imagePostBody.image_url,
  );
  TestValidator.equals(
    "image post type matches",
    updatedImagePost.type,
    "image",
  );
}
