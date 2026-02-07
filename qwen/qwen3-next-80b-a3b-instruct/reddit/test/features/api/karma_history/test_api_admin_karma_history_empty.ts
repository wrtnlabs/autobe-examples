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

export async function test_api_admin_karma_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = typia.random<ICommunityAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Generate a user ID that has never interacted with the system (no karma history)
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Call the admin karma history endpoint for the user with no karma history
  const karmaHistory = await api.functional.community.admin.users.karma.index(
    adminConnection,
    {
      userId,
    },
  );
  typia.assert(karmaHistory);
  // Validate pagination metadata is correct for zero-result scenario
  TestValidator.equals(
    "pagination current page",
    karmaHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", karmaHistory.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    karmaHistory.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", karmaHistory.pagination.pages, 0);
  // Validate data array is empty
  TestValidator.equals("data array length", karmaHistory.data.length, 0);
}
