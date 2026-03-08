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

export async function test_api_admin_ban_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678" satisfies string &
        tags.MinLength<8> &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test with valid user ID (will return ban details if user exists and is banned)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const banDetails = await api.functional.discussionBoard.admin.bans.details.at(
    adminConnection,
    {
      userId,
    },
  );
  typia.assert(banDetails);
  // Validate response structure
  TestValidator.predicate("has valid user summary", banDetails.user !== null);
  TestValidator.predicate(
    "has valid administrator summary",
    banDetails.administrator !== null,
  );
  TestValidator.predicate("has ban reason", banDetails.ban_reason.length > 0);
  TestValidator.predicate(
    "has valid timestamp",
    new Date(banDetails.banned_at) instanceof Date,
  );
}
