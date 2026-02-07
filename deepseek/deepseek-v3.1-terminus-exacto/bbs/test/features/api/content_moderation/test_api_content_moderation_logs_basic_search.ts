import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_moderation_logs_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Test basic content moderation logs search with default pagination
  const logs =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(logs);
  // Validate pagination calculations (business logic, not type validation)
  TestValidator.equals(
    "pages calculation",
    logs.pagination.pages,
    Math.ceil(logs.pagination.records / Math.max(logs.pagination.limit, 1)),
  );
  // Validate that limit is within acceptable range (business constraint)
  TestValidator.predicate(
    "limit within acceptable range",
    logs.pagination.limit >= 1 && logs.pagination.limit <= 100,
  );
  // Validate that current page is reasonable (business constraint)
  TestValidator.predicate(
    "current page is reasonable",
    logs.pagination.current >= 0 &&
      logs.pagination.current <= logs.pagination.pages,
  );
}
