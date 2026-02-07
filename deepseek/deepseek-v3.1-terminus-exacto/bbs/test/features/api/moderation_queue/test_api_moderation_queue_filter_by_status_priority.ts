import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queue_filter_by_status_priority(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
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
  // Test filtering for pending and high priority moderation tasks
  const filterRequest: IDiscussionBoardContentModerationQueue.IRequest = {
    moderation_status: "pending",
    priority_level: "high",
    page: 1,
    limit: 10,
  };
  const result =
    await api.functional.discussionBoard.admin.moderation_queue.index(
      adminConnection,
      {
        body: filterRequest,
      },
    );
  typia.assert(result);
  // Validate that all returned entries match the filter criteria
  for (const entry of result.data) {
    if (entry.moderation_status !== "pending") {
      throw new Error(
        `Expected moderation_status to be 'pending', but got '${entry.moderation_status}'`,
      );
    }
    if (entry.priority_level !== "high") {
      throw new Error(
        `Expected priority_level to be 'high', but got '${entry.priority_level}'`,
      );
    }
  }
  // Validate pagination structure
  if (result.pagination.pages < 0) {
    throw new Error(
      `Expected pages to be >= 0, but got ${result.pagination.pages}`,
    );
  }
  if (result.pagination.records < 0) {
    throw new Error(
      `Expected records to be >= 0, but got ${result.pagination.records}`,
    );
  }
  if (result.pagination.current !== 1) {
    throw new Error(
      `Expected current page to be 1, but got ${result.pagination.current}`,
    );
  }
}
