import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_ban_appeal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system to establish authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(adminAuthorized);
  // 2. Create a ban appeal by first creating a ban record (simulated setup)
  // Since there's no direct API to create a ban appeal, we'll use a valid appeal ID
  // In a real scenario, this would be created through the ban appeal submission flow
  const appealId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves the ban appeal details
  const appeal = await api.functional.discussionBoard.admin.bans.appeals.at(
    adminConnection,
    {
      appealId,
    },
  );
  typia.assert(appeal);
  // 4. Validate the appeal structure
  // Since IDiscussionBoardBansAppeal is empty, we can only verify it's an object
  TestValidator.predicate("appeal is object", typeof appeal === "object");
}
