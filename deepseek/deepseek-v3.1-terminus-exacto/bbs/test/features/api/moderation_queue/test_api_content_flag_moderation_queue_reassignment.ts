import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_flag_moderation_queue_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator connection
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Create second administrator connection
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Create a content flag ID for testing
  const contentFlagId = typia.random<string & tags.Format<"uuid">>();
  // Test reassignment from admin1 to admin2
  const updatedQueue =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.patchByContentflagid(
      admin1Connection,
      {
        contentFlagId,
        body: {
          assigned_admin_id: admin2.id,
        } satisfies IDiscussionBoardContentModerationQueue.IUpdate,
      },
    );
  typia.assert(updatedQueue);
  // Validate that the assignment was successful
  TestValidator.equals(
    "assigned admin ID should be updated",
    (updatedQueue as any).assigned_admin_id,
    admin2.id,
  );
  // Test reassignment back to admin1
  const reassignedQueue =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.patchByContentflagid(
      admin2Connection,
      {
        contentFlagId,
        body: {
          assigned_admin_id: admin1.id,
        } satisfies IDiscussionBoardContentModerationQueue.IUpdate,
      },
    );
  typia.assert(reassignedQueue);
  // Validate the reassignment back
  TestValidator.equals(
    "assigned admin ID should be updated back to admin1",
    (reassignedQueue as any).assigned_admin_id,
    admin1.id,
  );
  // Test setting assigned_admin_id to null
  const unassignedQueue =
    await api.functional.discussionBoard.admin.content_flags.moderation_queues.patchByContentflagid(
      admin1Connection,
      {
        contentFlagId,
        body: {
          assigned_admin_id: null,
        } satisfies IDiscussionBoardContentModerationQueue.IUpdate,
      },
    );
  typia.assert(unassignedQueue);
  // Validate that assignment was removed
  TestValidator.equals(
    "assigned admin ID should be null",
    (unassignedQueue as any).assigned_admin_id,
    null,
  );
}