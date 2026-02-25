import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_action_types_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin using SDK (utility not importable)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Create request with impossible filters
  const body = {
    category: "non-existent-category",
    severity_level: "fake-severity-level",
    is_active: true,
    page: 1,
    limit: 20,
    sort: "created_at_desc",
  } satisfies IDiscussionBoardModerationActionType.IRequest;
  // 3. Call the moderation action types search endpoint
  const page =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      { body },
    );
  typia.assert(page);
  // 4. Validate empty result set structure
  TestValidator.equals("data array should be empty", page.data, []);
  TestValidator.equals(
    "pagination.current should be 1",
    page.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should match request",
    page.pagination.pagination.pagination.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    page.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    page.pagination.pagination.pagination.pagination.pages,
    0,
  );
}
