import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";

export async function test_api_post_comments_sorted_fetch_best(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. User creates a post (to have comments)
  const postCreateBody = typia.random<ICommunityPlatformPost.ICreate>();
  const postRaw = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: postCreateBody,
    },
  );
  const post = typia.assert<ICommunityPlatformPost>(postRaw);

  // 3. Cannot determine the correct postId property on ICommunityPlatformPost as neither 'post_id' nor 'id' exists.
  // Therefore, cannot proceed to fetch sorted comments due to type safety.
  // You must provide a valid known property name or value for postId.
  throw new Error("Cannot get a valid postId property from ICommunityPlatformPost for request parameter 'postId'. Provide valid property.");
}
