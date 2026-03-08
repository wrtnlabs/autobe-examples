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

export async function test_api_post_update_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberA);
  // Step 2: Create a post as member A
  const post = await api.functional.redditLike.member.posts.update(
    memberAConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content(),
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(post);
  // Step 3: Register member B (unauthorized updater)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // Step 4: Test unauthorized post update attempt by member B
  await TestValidator.error("unauthorized post update", async () => {
    await api.functional.redditLike.member.posts.update(memberBConnection, {
      postId: post.id,
      body: {
        title: "Unauthorized Update",
        type: "text",
        content: "This update should be rejected",
      } satisfies IRedditLikePost.IUpdate,
    });
  });
  // Step 5: Test update on non-existent post ID
  await TestValidator.error("non-existent post update", async () => {
    await api.functional.redditLike.member.posts.update(memberAConnection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        title: "Update Non-existent",
        type: "text",
        content: "Should fail",
      } satisfies IRedditLikePost.IUpdate,
    });
  });
}