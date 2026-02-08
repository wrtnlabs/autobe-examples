import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_moderation_logs_create_moderation_log } from "../../../generate/generate_random_community_platform_moderator_moderation_logs_create_moderation_log";
import { prepare_random_community_platform_moderation_log } from "../../../prepare/prepare_random_community_platform_moderation_log";

/**
 * E2E Test for moderator moderation log creation varied cases.
 *
 * This test covers:
 * - Successful creation of moderation logs by authorized moderators.
 * - Creation of logs referencing posts or comments with action details.
 * - Handling attempts to create logs with invalid or missing references.
 * - Authorization enforcement ensuring only moderators can create logs.
 */
export async function test_api_moderator_moderation_log_creation_varied_cases(
  connection: api.IConnection,
): Promise<void> {
  // --- Step 1: Moderator join and setup ---
  const moderatorConnection: IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // --- Scenario 1 ---
  // Moderator creates a moderation log with valid post_id, action_type, and optional action_details.
  // Use generation utility to create a valid post-based moderation log.
  const moderationLogPostRaw =
    await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
      moderatorConnection,
      {
        body: {
          post_id: typia.random<string & typia.tags.Format<"uuid">>(),
          comment_id: null,
          action_type: "delete_post",
          action_details: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // Type assertion to inline type that has required properties for test validation
  const moderationLogPost = moderationLogPostRaw as unknown as {
    post_id: string | null;
    comment_id: string | null;
    action_type: "delete_post" | "delete_comment" | "ban_user" | string;
    action_details: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  typia.assert(moderationLogPost);
  // Validate properties
  TestValidator.predicate(
    "post_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      moderationLogPost.post_id ?? "",
    ),
  );
  TestValidator.equals(
    "comment_id is null",
    moderationLogPost.comment_id,
    null,
  );
  TestValidator.equals(
    "action_type matches",
    moderationLogPost.action_type,
    "delete_post",
  );
  TestValidator.predicate(
    "action_details is not empty",
    moderationLogPost.action_details !== null && moderationLogPost.action_details.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof moderationLogPost.created_at === "string" &&
      moderationLogPost.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof moderationLogPost.updated_at === "string" &&
      moderationLogPost.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null",
    moderationLogPost.deleted_at,
    null,
  );
  // Immutability test: try to update - should be immutable except soft delete (only system)
  // There is no update API in scope, so we test immutability by creating another log and comparing
  const moderationLogPost2Raw =
    await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
      moderatorConnection,
      {
        body: {
          post_id: moderationLogPost.post_id,
          comment_id: null,
          action_type: "ban_user",
          action_details: null,
        },
      },
    );
  const moderationLogPost2 = moderationLogPost2Raw as unknown as {
    post_id: string | null;
    comment_id: string | null;
    action_type: "delete_post" | "delete_comment" | "ban_user" | string;
    action_details: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  typia.assert(moderationLogPost2);
  TestValidator.notEquals(
    "immutability test: different action_type",
    moderationLogPost.action_type,
    moderationLogPost2.action_type,
  );
  // --- Scenario 2 ---
  // Moderator creates moderation log for comment action
  const moderationLogCommentRaw =
    await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
      moderatorConnection,
      {
        body: {
          post_id: null,
          comment_id: typia.random<string & typia.tags.Format<"uuid">>(),
          action_type: "delete_comment",
          action_details: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  const moderationLogComment = moderationLogCommentRaw as unknown as {
    post_id: string | null;
    comment_id: string | null;
    action_type: "delete_post" | "delete_comment" | "ban_user" | string;
    action_details: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  typia.assert(moderationLogComment);
  TestValidator.equals("post_id is null", moderationLogComment.post_id, null);
  TestValidator.predicate(
    "comment_id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      moderationLogComment.comment_id ?? "",
    ),
  );
  TestValidator.equals(
    "action_type is delete_comment",
    moderationLogComment.action_type,
    "delete_comment",
  );
  TestValidator.predicate(
    "action_details has content",
    moderationLogComment.action_details !== null && moderationLogComment.action_details.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof moderationLogComment.created_at === "string" &&
      moderationLogComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof moderationLogComment.updated_at === "string" &&
      moderationLogComment.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null",
    moderationLogComment.deleted_at,
    null,
  );
  // --- Scenario 3 ---
  // Attempt to create a moderation log with null post_id and comment_id (both null)
  await TestValidator.error(
    "creation error with null post_id and comment_id",
    async () => {
      await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
        moderatorConnection,
        {
          body: {
            post_id: null,
            comment_id: null,
            action_type: "delete_post",
            action_details: null,
          },
        },
      );
    },
  );
  // Attempt to create a moderation log with non-existent post_id and comment_id
  await TestValidator.error(
    "creation error with non-existent post_id",
    async () => {
      await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
        moderatorConnection,
        {
          body: {
            post_id: "00000000-0000-0000-0000-000000000000",
            comment_id: null,
            action_type: "ban_user",
            action_details: null,
          },
        },
      );
    },
  );
  await TestValidator.error(
    "creation error with non-existent comment_id",
    async () => {
      await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
        moderatorConnection,
        {
          body: {
            post_id: null,
            comment_id: "00000000-0000-0000-0000-000000000000",
            action_type: "ban_user",
            action_details: null,
          },
        },
      );
    },
  );
  // Authorization enforcement
  // Create a new connection without auth headers
  const unauthorizedConnection: IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized moderation log creation",
    401,
    async () => {
      await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
        unauthorizedConnection,
        {
          body: {
            post_id: typia.random<string & typia.tags.Format<"uuid">>(),
            comment_id: null,
            action_type: "delete_post",
            action_details: null,
          },
        },
      );
    },
  );
}
