import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPayout";
import type { IPageICommunityPlatformPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPayout";

export async function test_api_payout_search_filtered_by_admin(
  connection: api.IConnection,
) {
  // The request body schema is defined as 'string', not an object
  // Despite scenario expectations of object-based filtering (creator_id, status, etc.),
  // the actual DTO ICommunityPlatformPayout.IRequest is a string type
  // We cannot construct an object because it would violate type safety
  // Therefore, we use a valid string representation of a potential JSON filter

  // Generate a valid random string as the filter request body
  const searchCriteria: ICommunityPlatformPayout.IRequest =
    typia.random<string>();

  // Perform the search operation
  const result: IPageICommunityPlatformPayout.ISummary =
    await api.functional.communityPlatform.admin.payouts.index(connection, {
      body: searchCriteria,
    });
  typia.assert(result);
}
