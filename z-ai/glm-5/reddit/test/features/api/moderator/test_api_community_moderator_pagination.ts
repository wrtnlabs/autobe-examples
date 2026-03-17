import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_moderator_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community - member becomes owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Request moderator list with limit=1, page=1
  const response =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify pagination structure
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 1);
  TestValidator.predicate("records >= 1", response.pagination.records >= 1);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Verify records count matches total moderators (at least 1 for owner)
  TestValidator.predicate("data has items", response.data.length >= 1);
  TestValidator.predicate(
    "data length <= limit",
    response.data.length <= response.pagination.limit,
  );
  // 6. Test sort by created_at
  const sortedByCreatedAt =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "created_at",
          limit: 10,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  // 7. Test sort by username
  const sortedByUsername =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "username",
          limit: 10,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(sortedByUsername);
  // 8. Verify both sorted responses have valid pagination
  TestValidator.predicate(
    "created_at sorted has valid pagination",
    sortedByCreatedAt.pagination.current >= 1,
  );
  TestValidator.predicate(
    "username sorted has valid pagination",
    sortedByUsername.pagination.current >= 1,
  );
  // 9. Test with maximum limit
  const maxLimitResponse =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          limit: 100,
          page: 1,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.predicate(
    "max limit response has valid data",
    maxLimitResponse.data.length <= 100,
  );
  // 10. Test filter by role 'owner'
  const ownerOnlyResponse =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          role: "owner",
          limit: 10,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(ownerOnlyResponse);
  // Verify owner exists in the response
  TestValidator.predicate(
    "owner role filter returns at least 1",
    ownerOnlyResponse.data.length >= 1,
  );
  TestValidator.predicate(
    "all results have owner role",
    ownerOnlyResponse.data.every((m) => m.role === "owner"),
  );
}
