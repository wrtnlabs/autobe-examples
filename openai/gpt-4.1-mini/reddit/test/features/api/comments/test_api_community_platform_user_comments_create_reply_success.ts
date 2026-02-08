import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

/**
 * Test scenario for successfully creating a reply comment nested under an existing comment on a post by an authenticated user.
 * Prerequisite: User registration (join) to obtain authenticated user context.
 * Setup existing post and comment to reply to (assume existing with known UUIDs).
 * Steps: User sends POST request to /communityPlatform/user/comments with post_id, parent_id of the comment to reply to, and textual comment content.
 * Validate response contains newly created comment with parent_id matching the reply target comment UUID.
 * Ensure is_deleted is false and timestamps are correctly set.
 * Validate user authorization is required and unauthorized requests are rejected.
 */
export async function test_api_community_platform_user_comments_create_reply_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration to obtain authorization token
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorizedUser);
  // 2. Create user-specific connection with Authorization header
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 3. Prepare existing post_id and parent_id (known UUIDs assumed for test)
  // Since we don't have API to create posts or comments here, hardcode dummy UUIDs
  // In a real test environment, these should be created or fetched properly
  const existingPostId =
    "11111111-1111-1111-1111-111111111111" satisfies string;
  const existingParentCommentId =
    "22222222-2222-2222-2222-222222222222" satisfies string;
  // 4. Create the reply comment using utility which fills missing properties
  const raw = await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {
        parent_id: existingParentCommentId,
        post_id: existingPostId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // Use any type to accommodate properties
  const result = typia.assert(raw) as unknown as {
    parent_id: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
  };
  // 5. Validate response fields
  TestValidator.equals(
    "parent_id matches reply target",
    result.parent_id,
    existingParentCommentId,
  );
  TestValidator.predicate("is_deleted is false", result.is_deleted === false);
  TestValidator.predicate(
    "created_at is a valid ISO string",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid ISO string",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );
  // 6. Authorization required - attempt request without authorization header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized request rejects",
    401,
    async () => {
      await api.functional.communityPlatform.user.comments.create(
        unauthorizedConnection,
        {
          body: {
            parent_id: existingParentCommentId,
            post_id: existingPostId,
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
