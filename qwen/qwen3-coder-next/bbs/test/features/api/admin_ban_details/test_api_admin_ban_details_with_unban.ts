import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_details_with_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "Admin1234!",
      display_name: `Admin ${RandomGenerator.name(2)}`,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate a user ID for testing
  const userId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve ban details for a non-existent ban record
  // This tests the error handling for invalid ban records
  await TestValidator.httpError(
    "returns 404 for non-existent ban",
    404,
    async () => {
      await api.functional.discussionBoard.admin.bans.details.at(
        adminConnection,
        {
          userId,
        },
      );
    },
  );
}
