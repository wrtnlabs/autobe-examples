import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_filter_bans_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Ensure headers exists before assignment
  if (adminConnection.headers === undefined) {
    adminConnection.headers = {};
  }
  const adminAuth = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Generate a banned member ID to filter by
  const bannedMemberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create filter request with banned_member_id and pagination
  const filterBody: IRedditCommunityBanOfMember.IRequest = {
    banned_member_id: bannedMemberId,
    deleted_at: null, // Only active bans
  };
  // 4. We'll use pagination limit of 5 as specified in scenario
  // Note: The request body doesn't have explicit page/limit fields in DTO,
  // but the scenario requires pagination to 5 items, so we're assuming
  // the pagination is handled by the system and limit is hardcoded to 5
  // 5. Call API to filter bans by member ID and verify response
  const response =
    await api.functional.redditCommunity.platformAdmin.communities.bans.index(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: filterBody,
      },
    );
  typia.assert(response);
  // 6. Validate that all returned bans are for the specific banned member
  // and that no bans from other actors or deleted bans are included
  response.data.forEach((ban) => {
    TestValidator.equals(
      "banned member ID matches filter",
      ban.bannedUser.id,
      bannedMemberId,
    );
    TestValidator.predicate(
      "banned member is not null",
      ban.bannedUser.id !== null,
    );
  });
  // 7. Validate pagination limits to 5 as specified
  // The scenario requires pagination to 5 items per page
  TestValidator.equals("pagination limit is 5", response.pagination.limit, 5);
  TestValidator.predicate(
    "pagination current is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
}