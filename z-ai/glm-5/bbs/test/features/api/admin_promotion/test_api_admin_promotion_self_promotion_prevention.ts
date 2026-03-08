import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promotion_self_promotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Step 1: Create an admin account (starts as 'regular' grade by default)
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(authorizedAdmin);
  // Step 2: Regular admin attempts to call promote endpoint
  // The promote endpoint requires super admin authentication
  // Regular admin will receive 403 Forbidden
  // Note: This tests authorization enforcement, not self-promotion prevention
  // Self-promotion prevention testing requires a super admin account,
  // which cannot be created through the available APIs
  await TestValidator.httpError(
    "should reject regular admin calling promote endpoint with 403",
    403,
    async () => {
      await api.functional.discussionBoard.admin.admins.promote(
        adminConnection,
        {
          adminId: authorizedAdmin.id,
          body: {} satisfies IDiscussionBoardAdmin.IPromote,
        },
      );
    },
  );
}
