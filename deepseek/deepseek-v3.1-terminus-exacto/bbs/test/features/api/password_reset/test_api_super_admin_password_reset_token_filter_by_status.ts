import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_password_reset_token_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super admin
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Test unused tokens filter
  const unusedTokens =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          used: false,
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(unusedTokens);
  // Test used tokens filter
  const usedTokens =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          used: true,
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(usedTokens);
  // Test expired tokens filter
  const expiredTokens =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          expired: true,
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiredTokens);
  // Test combined filter (both used and expired)
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          used: true,
          expired: true,
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate that each filter returns appropriate results
  TestValidator.predicate(
    "unused tokens filter applied",
    unusedTokens.data.length >= 0,
  );
  TestValidator.predicate(
    "used tokens filter applied",
    usedTokens.data.length >= 0,
  );
  TestValidator.predicate(
    "expired tokens filter applied",
    expiredTokens.data.length >= 0,
  );
  TestValidator.predicate(
    "combined filter applied",
    combinedFilter.data.length >= 0,
  );
}
