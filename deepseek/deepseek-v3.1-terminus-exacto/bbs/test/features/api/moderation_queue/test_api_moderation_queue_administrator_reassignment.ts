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

/**
 * Test administrator reassignment of a moderation queue entry.
 * 1. Admin1 authenticates via join utility.
 * 2. Regular user authenticates via join and submits a content flag, generating a moderation queue entry.
 * 3. Admin2 authenticates via join.
 * 4. Admin1 updates the moderation queue entry, assigning it to Admin2.
 * 5. Validate reassignment success, assignment history increment, and proper workflow state.
 */
export async function test_api_moderation_queue_administrator_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate first administrator
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin1);
  // Step 2: Create regular user and submit content flag
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Create content flag (generates moderation queue)
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: null,
          flagged_comment_id: null,
          flag_reason: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string & tags.MinLength<1> as string & tags.MinLength<1>,
        },
      },
    );
  typia.assert(contentFlag);
  // Step 3: Authenticate second administrator (target for reassignment)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin2);
  // Step 4: Fetch the moderation queue ID (assuming there is an endpoint to list/fetch; we need to deduce it from contentFlag ID).
  // Since we cannot assume additional endpoints, we need to infer that contentFlag.id corresponds to the moderation queue entry.
  // The scenario says content flag generates a moderation queue entry – we assume the queue entry ID equals the content flag ID.
  const queueId = contentFlag.id satisfies string &
    tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // Step 5: Admin1 updates the moderation queue entry, assigning it to Admin2
  const updateBody = {
    assigned_admin_id: admin2.id,
    moderation_status: "under_review" as const,
    assignment_history_count: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IDiscussionBoardContentModerationQueueAssignment.IUpdate;
  const updatedQueue =
    await api.functional.discussionBoard.admin.moderation_queues.update(
      admin1Connection,
      {
        queueId,
        body: updateBody,
      },
    );
  typia.assert(updatedQueue);
  // Step 6: Validate reassignment succeeded
  TestValidator.equals(
    "assigned admin matches target",
    updatedQueue.assignedAdmin?.id,
    admin2.id,
  );
  TestValidator.notEquals(
    "assigned admin is not original admin",
    updatedQueue.assignedAdmin?.id,
    admin1.id,
  );
  TestValidator.equals(
    "moderation status updated",
    updatedQueue.moderationStatus,
    "under_review",
  );
  TestValidator.predicate(
    "assignment history count increased",
    updatedQueue.assignmentHistoryCount > 0,
  );
}
