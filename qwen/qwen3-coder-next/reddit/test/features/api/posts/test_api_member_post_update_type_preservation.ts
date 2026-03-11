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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_post_update_type_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and get token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(memberInfo);
  // 2. Auth as the member to create a text post
  const postCreatorConnection: api.IConnection = { host: connection.host };
  postCreatorConnection.headers = {
    Authorization: memberInfo.token.access,
  };
  // 3. Create a text post first
  const textPost = await api.functional.redditLike.member.posts.create(
    postCreatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals("initial type is text", textPost.type, "text");
  // 4. Attempt to update the post to change type to 'link'
  const updatedPost = await api.functional.redditLike.member.posts.update(
    postCreatorConnection,
    {
      postId: textPost.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "link" as const,
        url: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 5. Verify that post type remains unchanged
  TestValidator.equals("post type cannot be changed", updatedPost.type, "text");
  // 6. Verify that title was updated
  TestValidator.equals("title updated", updatedPost.title, textPost.title);
  // 7. Verify content field remains null (text post)
  TestValidator.equals(
    "content preserved for text post",
    updatedPost.content,
    textPost.content,
  );
}
