import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_moderation_queue_workflow_transition(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User setup and content flag creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies DeepPartial<IDiscussionBoardUser.IJoin>,
  });
  // Log in with the created user
  const userLoginBody = {
    email: userConnection.headers?.Authorization
      ? typia.random<string & tags.Format<"email">>()
      : "", // placeholder, will be replaced
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardUser.ILogin;
  // We need to store the actual email used in join
  // Since we can't retrieve it from join output in this scope, we'll generate a consistent one
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  // Re-join with known credentials
  const userJoinConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userJoinConnection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies DeepPartial<IDiscussionBoardUser.IJoin>,
  });
  const userAuthConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userAuthConnection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Create content flag using utility function
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userAuthConnection,
      {
        body: {
          flagged_article_id: null,
          flagged_comment_id: null,
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IDiscussionBoardContentFlag.ICreate>,
      },
    );
  typia.assert(contentFlag);
  // Step 2: Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IDiscussionBoardAdmin.IJoin>,
  });
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: adminHref,
      referrer: adminReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IDiscussionBoardAdmin.IJoin>,
  });
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Step 3: Get queue ID and transition statuses
  // The queue ID is the content flag ID (or need to be derived - assuming direct mapping)
  const queueId = contentFlag.id;
  // Transition from 'pending' to 'under_review'
  const underReviewUpdate = {
    moderation_status: "under_review" as const,
  } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate;
  const underReviewResult =
    await api.functional.discussionBoard.admin.moderation_queues.update(
      adminAuthConnection,
      {
        queueId,
        body: underReviewUpdate,
      },
    );
  typia.assert(underReviewResult);
  TestValidator.equals(
    "status should be under_review",
    underReviewResult.moderationStatus,
    "under_review",
  );
  TestValidator.predicate(
    "updated_at should be recent",
    new Date(underReviewResult.updatedAt).getTime() > Date.now() - 60000,
  );
  // Transition from 'under_review' to 'resolved'
  const resolvedUpdate = {
    moderation_status: "resolved" as const,
    resolved_at: new Date().toISOString(),
  } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate;
  const resolvedResult =
    await api.functional.discussionBoard.admin.moderation_queues.update(
      adminAuthConnection,
      {
        queueId,
        body: resolvedUpdate,
      },
    );
  typia.assert(resolvedResult);
  TestValidator.equals(
    "status should be resolved",
    resolvedResult.moderationStatus,
    "resolved",
  );
  TestValidator.predicate(
    "resolved_at should be set",
    resolvedResult.resolvedAt !== null,
  );
  TestValidator.predicate(
    "updated_at should be after previous update",
    new Date(resolvedResult.updatedAt).getTime() >=
      new Date(underReviewResult.updatedAt).getTime(),
  );
  // Validate content flag linkage
  TestValidator.equals(
    "content flag should match",
    resolvedResult.contentFlag.id,
    contentFlag.id,
  );
}
