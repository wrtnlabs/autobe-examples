import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { generate_random_reddit_community_community_owner_moderation_actions_create } from "../../../generate/generate_random_reddit_community_community_owner_moderation_actions_create";
import { prepare_random_reddit_community_moderation_action_of_post } from "../../../prepare/prepare_random_reddit_community_moderation_action_of_post";

export async function test_api_moderation_action_create_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = ownerConnection.headers ?? {};
  const ownerAuth = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  ownerConnection.headers.Authorization = `Bearer ${ownerAuth.token.access}`;
  // 2. Create moderation action to delete a post with reason 'spam content'
  // Even though scenario implies a target post, no API exists to create a post.
  // The moderation action endpoint accepts target_type and action_type without target_id.
  // We call the endpoint directly with valid parameters.
  await api.functional.redditCommunity.communityOwner.moderation_actions.create(
    ownerConnection,
    {
      body: {
        target_type: "post",
        action_type: "delete",
        reason: "spam content",
      } satisfies IRedditCommunityModerationActionOfPost.ICreate,
    },
  );
  // 3. Success is indicated by HTTP 201 Created with empty body
  // No response to validate; test passes if no error is thrown.
}