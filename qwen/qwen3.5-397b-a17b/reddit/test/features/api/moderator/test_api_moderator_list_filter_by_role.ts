import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test filtering moderators by role type to retrieve only non-owner moderators.
 *
 * Validates the complete moderator role filtering workflow including community owner authentication, community creation, second member registration, moderator assignment, and role-based filtering. Ensures that the role filter correctly excludes the owner and returns only moderators with role 'moderator'.
 *
 * The test establishes a community with an owner, adds a second member as a moderator, then queries the moderator list with role='moderator' filter. This verifies that the filtering logic properly distinguishes between 'owner' and 'moderator' roles and returns only the expected subset.
 *
 * 1. Owner member authenticates via join and creates a new community.
 * 2. Second member authenticates via join separately.
 * 3. Owner adds second member as moderator with role 'moderator'.
 * 4. Query moderator list with role filter set to 'moderator'.
 * 5. Verify response contains exactly one moderator (the added member, not the owner).
 * 6. Verify pagination metadata shows correct filtered count.
 */
export async function test_api_moderator_list_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member authentication and community creation
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Second member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Owner adds second member as moderator with role 'moderator'
  const moderatorAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: memberAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Query moderator list with role filter set to 'moderator'
  const moderatorList =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "moderator",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorList);
  // 5. Verify response contains exactly one moderator (the added member, not the owner)
  TestValidator.equals("filtered count", moderatorList.data.length, 1);
  TestValidator.equals(
    "moderator is second member",
    moderatorList.data[0].member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "moderator role is correct",
    moderatorList.data[0].role,
    "moderator",
  );
  // 6. Verify owner is excluded from results
  const hasOwner = moderatorList.data.some(
    (mod) => mod.member.id === ownerAuth.id,
  );
  TestValidator.predicate(
    "owner excluded from moderator role filter",
    !hasOwner,
  );
  // 7. Verify pagination metadata reflects the filtered count
  TestValidator.equals(
    "pagination records match filtered count",
    moderatorList.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    moderatorList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages for single record",
    moderatorList.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    moderatorList.pagination.limit > 0,
  );
}
