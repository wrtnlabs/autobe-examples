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

export async function test_api_moderators_index_filtering_username_karma(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account setup - join
  const adminConnection: api.IConnection = { host: connection.host };
  // Join admin account
  const joinOutput = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(joinOutput);
  // Update connection headers with token from join
  adminConnection.headers = {
    Authorization: `Bearer ${joinOutput.token.access}`,
  };
  // Call moderators.index with empty request body as filter fields are not defined
  const requestBody: ICommunityPlatformModerator.IRequest = {};
  const response = await api.functional.communityPlatform.moderators.index(
    adminConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(response);
  // Validate pagination fields
  TestValidator.predicate(
    "valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("non-negative limit", response.pagination.limit >= 0);
  TestValidator.predicate(
    "non-negative records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages consistent", response.pagination.pages >= 0);
  // Validate each moderator in data array
  for (const moderator of response.data) {
    typia.assert(moderator);
    // karma can be negative, no extra check needed here
  }
}
