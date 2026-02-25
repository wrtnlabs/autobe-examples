import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_logs_super_admin_search_by_text_target_entities(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate target entity IDs for filtering
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const targetArticleId = typia.random<string & tags.Format<"uuid">>();
  const targetSectionId = typia.random<string & tags.Format<"uuid">>();
  // Create search parameters with text search and entity filtering
  const searchParams = {
    search_term: "audit",
    target_user_id: targetUserId,
    target_article_id: targetArticleId,
    target_section_id: targetSectionId,
    updated_at_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updated_at_end: new Date().toISOString(),
    limit: 99,
    page: 1,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  // Perform log search using super admin connection
  const logs = await api.functional.discussionBoard.superAdmin.logs.index(
    superAdminConnection,
    { body: searchParams },
  );
  typia.assert(logs);
  // Validate pagination structure - use typia.assert for type validation
  TestValidator.predicate(
    "pagination exists",
    logs.pagination !== null && logs.pagination !== undefined,
  );
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(logs.data));
  // Validate that data contains audit log summaries if any exist
  if (logs.data.length > 0) {
    const firstLog = logs.data[0];
    typia.assert(firstLog);
    TestValidator.predicate(
      "log has required properties",
      firstLog.id !== undefined &&
        firstLog.action_type !== undefined &&
        firstLog.description !== undefined &&
        firstLog.created_at !== undefined,
    );
  }
}
