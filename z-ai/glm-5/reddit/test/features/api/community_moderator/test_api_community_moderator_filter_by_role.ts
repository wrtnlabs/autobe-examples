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

export async function test_api_community_moderator_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering moderator list by role type (owner vs moderator).
   *
   * Steps:
   * 1. Authenticate as member via join endpoint
   * 2. Create a community - member becomes owner
   * 3. Request moderator list filtered by role='owner'
   * 4. Verify response includes the owner
   * 5. Request moderator list filtered by role='moderator'
   * 6. Verify response contains empty data array (no appointed moderators yet)
   * 7. Request without role filter
   * 8. Verify response includes all roles (owner in this case)
   */
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
  // 3. Request moderator list filtered by role='owner'
  const ownerModerators =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: { role: "owner" } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(ownerModerators);
  // 4. Verify response includes the owner
  TestValidator.equals(
    "owner filter returns one moderator",
    ownerModerators.data.length,
    1,
  );
  TestValidator.equals(
    "moderator has owner role",
    ownerModerators.data[0].role,
    "owner",
  );
  TestValidator.equals(
    "moderator is community creator",
    ownerModerators.data[0].member.id,
    member.id,
  );
  TestValidator.predicate(
    "pagination reflects filtered count",
    ownerModerators.pagination.records === 1,
  );
  // 5. Request moderator list filtered by role='moderator'
  const moderatorModerators =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(moderatorModerators);
  // 6. Verify response contains empty data array
  TestValidator.equals(
    "moderator filter returns empty array",
    moderatorModerators.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero",
    moderatorModerators.pagination.records,
    0,
  );
  // 7. Request without role filter (undefined)
  const allModerators =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(allModerators);
  // 8. Verify response includes all roles (owner in this case)
  TestValidator.equals(
    "no filter returns all moderators",
    allModerators.data.length,
    1,
  );
  TestValidator.equals(
    "includes owner role",
    allModerators.data[0].role,
    "owner",
  );
  TestValidator.equals(
    "same owner as filtered result",
    allModerators.data[0].member.id,
    member.id,
  );
  TestValidator.equals(
    "pagination reflects total count",
    allModerators.pagination.records,
    1,
  );
}
