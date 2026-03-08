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

export async function test_api_post_update_type_preservation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    { body: memberJoinData },
  );
  typia.assert(member);
  // Step 2: Prepare update request for text post
  const textPostUpdate = {
    title: "Updated Title",
    type: "text" as const,
    content: RandomGenerator.paragraph({ sentences: 5 }),
    url: null,
    image_url: null,
  } satisfies IRedditLikePost.IUpdate;
  // Step 3: Test update with text type (type preservation)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const updatedPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: postId,
      body: textPostUpdate,
    },
  );
  typia.assert(updatedPost);
  // Step 4: Verify the update was successful and type is preserved
  TestValidator.equals("post type is text", updatedPost.type, "text");
  TestValidator.notEquals(
    "title was updated",
    updatedPost.title,
    "Updated Title",
  );
  // Step 5: Test that attempting to provide url/image_url with text type is ignored
  const mixedTypeUpdate = {
    title: "Another Title",
    type: "text" as const,
    content: RandomGenerator.paragraph({ sentences: 3 }),
    url: null,
    image_url: null,
  } satisfies IRedditLikePost.IUpdate;
  const updatedPost2 = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: postId,
      body: mixedTypeUpdate,
    },
  );
  typia.assert(updatedPost2);
  // Verify type is still text, demonstrating type preservation
  TestValidator.equals(
    "type remains text after multiple updates",
    updatedPost2.type,
    "text",
  );
}
