import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";

export async function test_api_moderator_guest_search_paginated(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail satisfies IModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate random search criteria
  const searchCriteria: ICommunityPlatformGuest.IRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    sortBy: RandomGenerator.pick([
      "createdAt",
      "sessionCount",
      "lastActivity",
    ] as const),
    sortOrder: RandomGenerator.pick(["asc", "desc"] as const),
    ipAddress: typia.random<string & tags.Format<"ipv4">>(),
    minSessionCount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxSessionCount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    createdAtFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAtTo: new Date().toISOString(),
  } satisfies ICommunityPlatformGuest.IRequest;

  // Step 3: Perform paginated search of guest users
  const result: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.moderator.guests.index(connection, {
      body: searchCriteria satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(result);
}
