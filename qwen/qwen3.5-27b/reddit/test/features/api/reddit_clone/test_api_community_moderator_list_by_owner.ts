import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that a community owner can retrieve the list of moderators for their community.
 * Verifies owner authentication, community creation, moderator addition, and moderator list retrieval.
 */
export async function test_api_community_moderator_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create a community (owner becomes automatic moderator with 'owner' role)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate a second member to add as moderator
  const modConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_member_join(modConnection, {});
  typia.assert(modAuth);
  // 4. Add second member as moderator (with 'mod' role)
  const moderator =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: modAuth.id,
          role: "mod",
        },
      },
    );
  typia.assert(moderator);
  // 5. Retrieve the moderator list as owner
  const moderatorList =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(moderatorList);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    moderatorList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", moderatorList.pagination.limit, 20);
  TestValidator.equals(
    "total moderators count",
    moderatorList.pagination.records,
    2,
  );
  TestValidator.equals("total pages", moderatorList.pagination.pages, 1);
  // 7. Validate moderator list contains 2 entries (owner + mod)
  TestValidator.equals("moderator list length", moderatorList.data.length, 2);
  // 8. Verify owner is in the list with 'owner' role
  const ownerModerator = moderatorList.data.find(
    (mod) => mod.member.id === ownerAuth.id,
  );
  TestValidator.predicate(
    "owner exists in moderator list",
    ownerModerator !== undefined,
  );
  TestValidator.equals("owner role is 'owner'", ownerModerator!.role, "owner");
  TestValidator.equals(
    "owner username matches",
    ownerModerator!.member.username,
    ownerAuth.username,
  );
  TestValidator.equals(
    "owner display_name matches",
    ownerModerator!.member.display_name,
    ownerAuth.display_name,
  );
  // 9. Verify added moderator is in the list with 'mod' role
  const modModerator = moderatorList.data.find(
    (mod) => mod.member.id === modAuth.id,
  );
  TestValidator.predicate(
    "moderator exists in moderator list",
    modModerator !== undefined,
  );
  TestValidator.equals("moderator role is 'mod'", modModerator!.role, "mod");
  TestValidator.equals(
    "moderator username matches",
    modModerator!.member.username,
    modAuth.username,
  );
  TestValidator.equals(
    "moderator display_name matches",
    modModerator!.member.display_name,
    modAuth.display_name,
  );
  // 10. Verify sorting by created_at DESC (owner should be first as they were created earlier)
  TestValidator.predicate(
    "moderators sorted by created_at DESC",
    new Date(moderatorList.data[0].created_at).getTime() >=
      new Date(moderatorList.data[1].created_at).getTime(),
  );
  // 11. Verify member details are included (karma is required, avatar_uri is optional)
  TestValidator.predicate(
    "owner has karma field",
    typeof ownerModerator!.member.karma === "number",
  );
  TestValidator.predicate(
    "moderator has karma field",
    typeof modModerator!.member.karma === "number",
  );
  TestValidator.predicate(
    "owner has created_at field",
    ownerModerator!.member.created_at !== undefined,
  );
  TestValidator.predicate(
    "moderator has created_at field",
    modModerator!.member.created_at !== undefined,
  );
}
