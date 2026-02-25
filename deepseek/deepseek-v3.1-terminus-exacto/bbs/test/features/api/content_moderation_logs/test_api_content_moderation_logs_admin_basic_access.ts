import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_moderation_logs_admin_basic_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and establish authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Call content moderation logs endpoint with default parameters
  const logs =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(logs);
  // 3. Validate business logic: pagination structure completeness
  TestValidator.predicate(
    "has pagination metadata",
    logs.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(logs.data));
  // 4. Validate pagination values are reasonable
  TestValidator.predicate(
    "current page is valid",
    (logs.pagination as any).current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    (logs.pagination as any).limit > 0 && (logs.pagination as any).limit <= 100,
  );
  TestValidator.predicate(
    "records count matches expectations",
    (logs.pagination as any).records >= 0,
  );
  TestValidator.predicate(
    "pages calculation is consistent",
    (logs.pagination as any).pages ===
      Math.ceil((logs.pagination as any).records / (logs.pagination as any).limit) ||
      ((logs.pagination as any).records === 0 && (logs.pagination as any).pages === 0),
  );
  // 5. Validate each log entry has essential fields (business logic, not type checking)
  for (const log of logs.data) {
    // Test that required fields exist and have non-empty values
    TestValidator.predicate("log has ID", log.id.length > 0);
    TestValidator.predicate("log has action type", log.action_type.length > 0);
    TestValidator.predicate(
      "log has target content type",
      log.target_content_type.length > 0,
    );
    TestValidator.predicate(
      "log has target content ID",
      log.target_content_id.length > 0,
    );
    TestValidator.predicate(
      "log has creation timestamp",
      log.created_at.length > 0,
    );
    // Validate admin reference exists
    TestValidator.predicate("log has admin reference", log.admin !== undefined);
    TestValidator.predicate("admin has ID", log.admin.id.length > 0);
    TestValidator.predicate("admin has email", log.admin.email.length > 0);
    TestValidator.predicate(
      "admin has display name",
      log.admin.display_name.length > 0,
    );
    TestValidator.predicate(
      "admin has creation timestamp",
      log.admin.created_at.length > 0,
    );
  }
}