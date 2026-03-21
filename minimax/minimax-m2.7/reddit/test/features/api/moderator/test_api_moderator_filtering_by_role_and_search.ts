import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";

export async function test_api_moderator_filtering_by_role_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 (owner) and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // 2. Create community - member1 becomes owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Create member2 (moderator) and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 4. Add member2 as moderator
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      member1Connection,
      {
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Filter by role='moderator' - should only return member2
  const moderatorOnlyResponse =
    await api.functional.redditClone.communities.moderators.index(
      member1Connection,
      {
        communityName: community.name,
        body: {
          role: "moderator",
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorOnlyResponse);
  TestValidator.equals(
    "moderator filter returns 1 result",
    moderatorOnlyResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "moderator is member2",
    moderatorOnlyResponse.data[0]!.member.username,
    member2.username,
  );
  TestValidator.equals(
    "moderator role is 'moderator'",
    moderatorOnlyResponse.data[0]!.role,
    "moderator",
  );
  // 6. Filter by role='owner' - should only return member1
  const ownerOnlyResponse =
    await api.functional.redditClone.communities.moderators.index(
      member1Connection,
      {
        communityName: community.name,
        body: {
          role: "owner",
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(ownerOnlyResponse);
  TestValidator.equals(
    "owner filter returns 1 result",
    ownerOnlyResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "owner is member1",
    ownerOnlyResponse.data[0]!.member.username,
    member1.username,
  );
  TestValidator.equals(
    "owner role is 'owner'",
    ownerOnlyResponse.data[0]!.role,
    "owner",
  );
  // 7. Search moderators by member2's username (partial match)
  const searchByMember2Response =
    await api.functional.redditClone.communities.moderators.index(
      member1Connection,
      {
        communityName: community.name,
        body: {
          searchMember: member2.username.substring(0, 3),
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(searchByMember2Response);
  TestValidator.equals(
    "search by partial username returns member2",
    searchByMember2Response.data.length,
    1,
  );
  TestValidator.equals(
    "searched member is member2",
    searchByMember2Response.data[0]!.member.username,
    member2.username,
  );
  // 8. Search with non-existent username - should return empty
  const nonExistentSearchResponse =
    await api.functional.redditClone.communities.moderators.index(
      member1Connection,
      {
        communityName: community.name,
        body: {
          searchMember: "nonexistent_user_xyz_12345",
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(nonExistentSearchResponse);
  TestValidator.equals(
    "non-existent search returns 0 results",
    nonExistentSearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "data array is empty",
    nonExistentSearchResponse.data.length,
    0,
  );
}
