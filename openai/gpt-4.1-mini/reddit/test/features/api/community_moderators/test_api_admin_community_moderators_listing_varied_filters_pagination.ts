import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * E2E test for admin community moderators listing with varied filters and pagination.
 *
 * Scenarios:
 * 1. List moderators without filters, validate pagination metadata and response structure.
 * 2. (Skipped) Filter by username and role - no filter properties in schema.
 * 3. (Skipped) Paginate different pages and limits - pagination properties not specified.
 *
 * Authorization: Must use admin connection authorized via join.
 */
export async function test_api_admin_community_moderators_listing_varied_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, { body: {} });
  // The utility function internally updates headers, so no manual header setting needed
  // Scenario 1: List without filters
  {
    const response =
      await api.functional.communityPlatform.admin.communityModerators.index(
        adminConnection,
        { body: {} },
      );
    typia.assert(response);
    // Validate pagination metadata
    const { pagination, data } = response;
    TestValidator.predicate(
      "pagination pages non-negative",
      pagination.pages >= 0,
    );
    TestValidator.equals("pagination current page is 1", pagination.current, 1);
    TestValidator.predicate(
      "pagination limit non-negative",
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      pagination.records >= 0,
    );
    // If limit > 0, data length <= limit
    if (pagination.limit > 0) {
      TestValidator.predicate(
        "data length <= pagination limit",
        data.length <= pagination.limit,
      );
    }
    // Data is an array
    TestValidator.predicate("data is array", Array.isArray(data));
  }
  // Scenario 2: Filter by moderator username and role (Skipped - no filter properties in schema)
  // Scenario 3: Pagination with different pages and limits (Skipped - no pagination properties in schema)
}
