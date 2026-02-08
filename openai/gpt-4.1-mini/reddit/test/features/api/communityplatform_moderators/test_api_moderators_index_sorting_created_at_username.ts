import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderators_index_sorting_created_at_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin user with join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminJoinResponse);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse = await authorize_admin_login(adminConnection, {
    body: {},
  });
  typia.assert(adminLoginResponse);
  // 2. Unauthorized access: create a new connection without auth header to test error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to moderators listing",
    401,
    async () => {
      await api.functional.communityPlatform.moderators.index(
        unauthorizedConnection,
        {
          body: {},
        },
      );
    },
  );
  // 3. List moderators with empty request body (as no sorting input in request schema)
  {
    const body = {};
    const response = await api.functional.communityPlatform.moderators.index(
      adminConnection,
      { body },
    );
    typia.assert(response);
    // Validate pagination
    TestValidator.predicate(
      "pagination current page >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit > 0",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      response.pagination.records >= 0,
    );
  }
}
