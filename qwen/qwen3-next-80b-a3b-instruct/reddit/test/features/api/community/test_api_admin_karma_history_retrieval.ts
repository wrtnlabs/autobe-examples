import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_karma_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // The utility function automatically updates adminConnection.headers with Authorization
  // 2. Retrieve karma history for an admin user
  // Since ICommunityAdmin.IAuthorized doesn't contain userId, we cannot extract it
  // Use a valid UUID as per endpoint requirement - this is a dummy value
  const userId = typia.random<string & tags.Format<"uuid">>();
  const karmaHistory = await api.functional.community.admin.users.karma.index(
    adminConnection,
    {
      userId,
    },
  );
  typia.assert(karmaHistory);
  // 3. Validate pagination metadata (as per specification)
  TestValidator.equals(
    "pagination limit is 20",
    karmaHistory.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    karmaHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    karmaHistory.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    karmaHistory.pagination.current >= 1,
  );
  // 4. Validate data is an array (per schema)
  TestValidator.predicate("data is array", Array.isArray(karmaHistory.data));
}
