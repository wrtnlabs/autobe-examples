import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test access control for system health metrics endpoint.
 * Verify that only authenticated administrators can access the metrics data,
 * while regular members and unauthorized users receive appropriate access denied responses.
 */
export async function test_api_admin_moderations_metrics_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test authorized admin access
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Admin should be able to access metrics
  const metrics =
    await api.functional.discussionBoard.admin.moderations.metrics.at(
      adminConnection,
    );
  typia.assert(metrics);
  TestValidator.predicate(
    "metrics should have pagination",
    metrics.pagination !== undefined,
  );
  TestValidator.predicate(
    "metrics should have data array",
    Array.isArray(metrics.data),
  );
  // 2. Test unauthorized member access
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Member should NOT be able to access metrics
  await TestValidator.httpError(
    "member should not access admin metrics",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.admin.moderations.metrics.at(
        memberConnection,
      );
    },
  );
  // 3. Test unauthorized access (no authentication)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Unauthenticated user should NOT be able to access metrics
  await TestValidator.httpError(
    "unauthorized should not access admin metrics",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.admin.moderations.metrics.at(
        unauthorizedConnection,
      );
    },
  );
}
