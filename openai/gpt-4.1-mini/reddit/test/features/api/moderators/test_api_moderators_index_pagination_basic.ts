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

export async function test_api_moderators_index_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinAuth = await authorize_admin_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminJoinAuth);
  // 2. Admin login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginAuth = await authorize_admin_login(adminLoginConnection, {
    body: {},
  });
  typia.assert(adminLoginAuth);
  // 3. Use admin authenticated connection for moderators index
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminLoginAuth.token.access };
  // 4. Request first page of moderators list
  const requestBody = {} satisfies ICommunityPlatformModerator.IRequest;
  const moderatorsPage =
    await api.functional.communityPlatform.moderators.index(adminConnection, {
      body: requestBody,
    });
  typia.assert(moderatorsPage);
  // Validate pagination object existence
  TestValidator.predicate(
    "pagination object exists",
    moderatorsPage.pagination !== undefined &&
      moderatorsPage.pagination !== null,
  );
  // Validate pagination current page is >= 1 (1-indexed)
  TestValidator.predicate(
    "pagination current page is >= 1",
    moderatorsPage.pagination.current >= 1,
  );
  // Validate pagination limit is positive
  TestValidator.predicate(
    "pagination limit > 0",
    moderatorsPage.pagination.limit > 0,
  );
  // Validate pagination records and pages are >= 0
  TestValidator.predicate(
    "pagination records >= 0",
    moderatorsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    moderatorsPage.pagination.pages >= 0,
  );
  // Validate the data array
  TestValidator.predicate(
    "moderators data is array",
    Array.isArray(moderatorsPage.data),
  );
  // Validate data length does not exceed limit
  TestValidator.predicate(
    "moderators data length <= pagination limit",
    moderatorsPage.data.length <= moderatorsPage.pagination.limit,
  );
  // Validate each moderator summary
  for (const moderator of moderatorsPage.data) {
    typia.assert(moderator);
  }
  // 5. Unauthorized access attempts
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to moderators index",
    401,
    async () => {
      await api.functional.communityPlatform.moderators.index(
        unauthConnection,
        {
          body: {},
        },
      );
    },
  );
}
