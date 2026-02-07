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

/**
 * Test retrieval attempt for a moderation queue entry that does not exist or belongs to a different content flag.
 * This scenario validates the system's error handling when administrators attempt to access non-existent or
 * mismatched moderation workflow entries. The test should verify appropriate error responses and validation
 * of the relationship between content flags and their moderation queues.
 */
export async function test_api_content_flag_moderation_queue_nonexistent_entry(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate random UUIDs that don't exist in the system
  const nonExistentContentFlagId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentQueueId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent moderation queue entry
  await TestValidator.error(
    "retrieve non-existent moderation queue entry",
    async () => {
      await api.functional.discussionBoard.admin.content_flags.moderation_queues.at(
        adminConnection,
        {
          contentFlagId: nonExistentContentFlagId,
          queueId: nonExistentQueueId,
        },
      );
    },
  );
  // Test with mismatched IDs scenario
  const anotherNonExistentQueueId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "retrieve moderation queue with mismatched IDs",
    async () => {
      await api.functional.discussionBoard.admin.content_flags.moderation_queues.at(
        adminConnection,
        {
          contentFlagId: nonExistentContentFlagId,
          queueId: anotherNonExistentQueueId,
        },
      );
    },
  );
}
