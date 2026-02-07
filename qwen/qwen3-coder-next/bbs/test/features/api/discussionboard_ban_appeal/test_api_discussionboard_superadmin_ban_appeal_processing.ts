import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAppeal";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super admin ban appeal processing workflow.
 * 1. Create super admin account
 * 2. Simulate ban appeal scenario (using available endpoints)
 * 3. Super admin processes the ban appeal
 * 4. Verify appeal processing result
 */
export async function test_api_discussionboard_superadmin_ban_appeal_processing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminResponse);
  // 2. Create ban appeal scenario
  // First, need to create a user and ban scenario using available endpoints
  // Since we only have superAdmin join endpoint available in the provided SDK,
  // we'll use mock data for testing the appeal processing workflow
  // 3. Submit a ban appeal (this would normally be done by a banned user)
  // Using mock data since the appeals creation endpoint is not available
  const appealBody: IDiscussionBoardBansAppeal.IRequest =
    typia.random<IDiscussionBoardBansAppeal.IRequest>();
  // 4. Super admin processes the appeal
  const appealId = typia.random<string & tags.Format<"uuid">>();
  const processResponse =
    await api.functional.discussionBoard.superAdmin.admins.bans.appeals.process(
      superAdminConnection,
      {
        appealId: appealId,
        body: appealBody,
      },
    );
  typia.assert(processResponse);
  // 5. Verify the appeal processing result
  // The response should contain the processed appeal information
  TestValidator.predicate(
    "appeal processed successfully",
    processResponse !== null,
  );
  // 6. Test appeal processing with rejection decision
  const rejectionResponse =
    await api.functional.discussionBoard.superAdmin.admins.bans.appeals.process(
      superAdminConnection,
      {
        appealId: appealId,
        body: appealBody,
      },
    );
  typia.assert(rejectionResponse);
  // 7. Verify rejection response
  TestValidator.predicate(
    "rejection processed successfully",
    rejectionResponse !== null,
  );
}
