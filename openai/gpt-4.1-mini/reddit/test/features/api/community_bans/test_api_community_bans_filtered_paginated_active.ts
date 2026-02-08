import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_bans_filtered_paginated_active(
  connection: api.IConnection,
): Promise<void> {
  // Moderator authentication by join
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Join request body is empty object
  const auth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, { body: {} });
  // Configure Authorization header with access token
  moderatorConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // Because the ICommunityPlatformCommunityBan.IRequest and ISummary are empty objects in the schema,
  // we cannot specify filters or verify internal properties of the ban summary object.
  // We can request the paginated bans with an empty body and validate the pagination metadata and
  // basic results.
  const bans =
    await api.functional.communityPlatform.moderator.community_bans.index(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(bans);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is positive",
    bans.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    bans.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    bans.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is consistent",
    bans.pagination.pages >= 0,
  );
  // Validate data array length matches pagination records on this page (data.length <= limit)
  TestValidator.predicate(
    "data length is not greater than pagination limit",
    bans.data.length <= bans.pagination.limit,
  );
  // Validate each item is an object (no property checks due to empty ISummary)
  bans.data.forEach((ban, index) => {
    TestValidator.predicate(
      `ban #${index} is an object`,
      typeof ban === "object" && ban !== null,
    );
  });
}
