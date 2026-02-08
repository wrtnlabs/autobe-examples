import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportDecision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_moderator_reports_decisions_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  await authorize_admin_login(adminConnection, { body: {} });
  // 2. Setup moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  await authorize_moderator_login(moderatorConnection, { body: {} });
  // 3. Setup user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: userAuth.token.access };
  await authorize_user_login(userConnection, { body: {} });
  // 4. Create multiple reports by the user
  const reports = await ArrayUtil.asyncRepeat(
    3,
    async () =>
      await generate_random_community_platform_reports_create(userConnection, {
        body: {},
      }),
  );
  for (const report of reports) typia.assert(report);
  // 5. Fetch report decisions page without filters
  const page =
    await api.functional.communityPlatform.moderator.reportsDecisions.index(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(page);
  // 6. Check pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", page.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    page.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages >= 0", page.pagination.pages >= 0);
  // 7. Check data array type and length only (cannot check internal properties of ISummary as they are unknown or non-existent)
  TestValidator.predicate("data is array", Array.isArray(page.data));
  TestValidator.predicate("data length >= 0", page.data.length >= 0);
  // 8. For each item in data array, typia.assert to ensure validity
  for (const decision of page.data) {
    typia.assert(decision);
  }
}
