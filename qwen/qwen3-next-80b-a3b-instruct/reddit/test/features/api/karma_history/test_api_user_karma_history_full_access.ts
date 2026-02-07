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

export async function test_api_user_karma_history_full_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<ICommunityAdmin.IJoin>(),
    },
  );
  typia.assert(adminAuth);
  // 2. Create a new user to test karma history on
  // Use a randomly generated UUID for userId as per the endpoint requirements
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Fetch karma history for the user with empty request body (no filters)
  const karmaHistory =
    await api.functional.community.admin.users.karma.history.index(
      adminConnection,
      {
        userId,
        body: {}, // Empty IRequest since no filters are applied
      },
    );
  typia.assert(karmaHistory);
  // 4. Validate behavior with a non-existent user or deleted user
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyHistory =
    await api.functional.community.admin.users.karma.history.index(
      adminConnection,
      {
        userId: nonExistentUserId,
        body: {}, // Empty IRequest for no filters
      },
    );
  typia.assert(emptyHistory);
  TestValidator.equals(
    "empty results for non-existent user",
    emptyHistory.data.length,
    0,
  );
  TestValidator.equals(
    "pagination for non-existent user records",
    emptyHistory.pagination.records,
    0,
  );
}
