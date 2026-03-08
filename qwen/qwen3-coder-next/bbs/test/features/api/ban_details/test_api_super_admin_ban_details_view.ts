import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_ban_details_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Generate a random user ID for testing
  const userId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve ban details for the user
  const banDetails =
    await api.functional.discussionBoard.superAdmin.bans.details.at(
      superAdminConnection,
      {
        userId: userId,
      },
    );
  typia.assert(banDetails);
  // 4. Verify the response structure
  typia.assert<string & tags.Format<"uuid">>(banDetails.id);
  typia.assert<string & tags.Format<"uuid">>(banDetails.user.id);
  typia.assert<string>(banDetails.user.display_name);
  typia.assert<string | null>(banDetails.user.bio);
  typia.assert<string & tags.Format<"uuid">>(banDetails.administrator.id);
  typia.assert<string>(banDetails.administrator.display_name);
  typia.assert<"admin" | "super_admin">(banDetails.administrator.role);
  typia.assert<string>(banDetails.ban_reason);
  typia.assert<string & tags.Format<"date-time">>(banDetails.banned_at);
  typia.assert<(string & tags.Format<"date-time">) | null>(
    banDetails.unbanned_at,
  );
}
