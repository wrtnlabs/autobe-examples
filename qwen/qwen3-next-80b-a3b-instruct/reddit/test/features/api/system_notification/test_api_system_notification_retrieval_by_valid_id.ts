import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_notification_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUIDv4
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the notification
  const retrievedNotification =
    await api.functional.redditCommunity.system_notifications.at(connection, {
      notificationId,
    });
  // Validate that the response matches the exact schema
  typia.assert(retrievedNotification);
}
