import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_regular_admin_approval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = typia.random<IDiscussionBoardAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: adminUser });
  // 2. Create super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminUser = typia.random<IDiscussionBoardSuperAdmin.IJoin>();
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminUser,
  });
  // 3. Create a dummy request ID for testing
  const dummyRequestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Regular admin attempts to approve a request (should be rejected with 403)
  await TestValidator.httpError(
    "regular admin cannot approve administrator requests",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.requests.approve(
        adminConnection,
        {
          requestId: dummyRequestId,
        },
      );
    },
  );
  // 5. Verify super admin can approve the same request after regular admin failure
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.requests.approve(
      superAdminConnection,
      {
        requestId: dummyRequestId,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "super admin can approve",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "processed_at is set after super admin approval",
    () => approvedRequest.processed_at !== null
  );
}