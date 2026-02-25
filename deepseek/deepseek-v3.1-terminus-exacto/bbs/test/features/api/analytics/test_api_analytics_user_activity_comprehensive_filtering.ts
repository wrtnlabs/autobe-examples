import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_analytics_user_activity_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Test analytics with comprehensive filters
  const filters: IDiscussionBoardSystemActivity.IRequest = {
    created_at_from: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_to: new Date().toISOString(),
    activity_type: "login",
    success_status: true,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const response =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      { body: filters },
    );
  typia.assert(response);
  // 3. Validate pagination metadata - simplified approach
  TestValidator.predicate(
    "has pagination data",
    response.pagination !== undefined,
  );
  // 4. Validate activity data structure
  TestValidator.predicate("has data array", Array.isArray(response.data));
  if (response.data.length > 0) {
    const activity = response.data[0];
    // Validate actor resolution (one of user, admin, or superAdmin should be present)
    TestValidator.predicate(
      "has user or admin or superAdmin actor",
      activity.user !== null ||
        activity.admin !== null ||
        activity.superAdmin !== null,
    );
  }
  // 5. Test with different filter combinations
  const alternativeFilters: IDiscussionBoardSystemActivity.IRequest = {
    target_entity_type: "user",
    success_status: true,
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const alternativeResponse =
    await api.functional.discussionBoard.superAdmin.analytics.user_activity.index(
      superAdminConnection,
      { body: alternativeFilters },
    );
  typia.assert(alternativeResponse);
  TestValidator.predicate(
    "alternative response has data",
    Array.isArray(alternativeResponse.data),
  );
  // 6. Test consistency across different filter combinations
  TestValidator.predicate(
    "both responses have valid structure",
    Array.isArray(response.data) && Array.isArray(alternativeResponse.data),
  );
}
