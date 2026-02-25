import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_security_analytics_resolved_events_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate consistent credentials for account creation and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Create super admin account
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Authenticate super admin with same credentials
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Test 1: Query resolved security events
  const resolvedResponse =
    await api.functional.discussionBoard.superAdmin.system.analytics.security.index(
      superAdminConnection,
      {
        body: {
          resolved: true,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(resolvedResponse);
  // Validate all resolved events are marked as resolved
  if (resolvedResponse.data.length > 0) {
    await TestValidator.predicate(
      "all resolved events have resolved=true",
      resolvedResponse.data.every((event) => event.resolved === true),
    );
  }
  // Test 2: Query unresolved security events
  const unresolvedResponse =
    await api.functional.discussionBoard.superAdmin.system.analytics.security.index(
      superAdminConnection,
      {
        body: {
          resolved: false,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(unresolvedResponse);
  // Validate all unresolved events are marked as resolved=false
  if (unresolvedResponse.data.length > 0) {
    await TestValidator.predicate(
      "all unresolved events have resolved=false",
      unresolvedResponse.data.every((event) => event.resolved === false),
    );
  }
  // Test 3: Query without resolution filter (should return all events)
  const allResponse =
    await api.functional.discussionBoard.superAdmin.system.analytics.security.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(allResponse);
}
