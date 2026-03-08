import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_list_moderator_view(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A (future community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Create member B (future moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(moderatorAuth);
  // Step 3: Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 4: Owner appoints member B as a moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          username: moderatorAuth.username,
        },
      },
    );
  typia.assert(moderatorRecord);
  // Step 5: Moderator B retrieves the moderator list
  const moderatorList =
    await api.functional.communityPlatform.communities.moderators.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorList);
  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    moderatorList.pagination !== undefined,
  );
  TestValidator.predicate("has data", moderatorList.data.length > 0);
  TestValidator.predicate(
    "current page is 1",
    moderatorList.pagination.current === 1,
  );
  // Step 7: Verify moderator B can see both owner and themselves in the list
  const moderatorIds = moderatorList.data.map((m) => m.member.id);
  TestValidator.predicate(
    "owner visible in moderator list",
    moderatorIds.includes(ownerAuth.id),
  );
  TestValidator.predicate(
    "moderator B visible in moderator list",
    moderatorIds.includes(moderatorAuth.id),
  );
  // Step 8: Validate moderator profile completeness
  moderatorList.data.forEach((mod) => {
    TestValidator.predicate("moderator has id", mod.id !== undefined);
    TestValidator.predicate(
      "moderator has member info",
      mod.member !== undefined,
    );
    TestValidator.predicate(
      "moderator has username",
      mod.member.username !== undefined,
    );
    TestValidator.predicate(
      "moderator has created_at",
      mod.createdAt !== undefined,
    );
  });
  // Step 9: Test sorting by newest
  const sortedByNewest =
    await api.functional.communityPlatform.communities.moderators.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          sort: "newest",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedByNewest);
  TestValidator.predicate(
    "sorted by newest has results",
    sortedByNewest.data.length > 0,
  );
  // Step 10: Test filtering by username
  const filteredByUsername =
    await api.functional.communityPlatform.communities.moderators.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          username: moderatorAuth.username,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(filteredByUsername);
  TestValidator.equals(
    "filtered by username returns correct moderator",
    filteredByUsername.data.length,
    1,
  );
  TestValidator.equals(
    "filtered username matches",
    filteredByUsername.data[0].member.username,
    moderatorAuth.username,
  );
}
