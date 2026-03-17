import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";

export async function test_api_moderator_list_filter_by_owner_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner is automatically added as moderator with is_owner=true)
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Register additional members to add as regular moderators
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1Auth = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator1Auth);
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2Auth = await authorize_member_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator2Auth);
  // 4. Add moderator1 and moderator2 as regular moderators to the community
  const mod1Assignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: moderator1Auth.id,
        } satisfies IRedditCloneModerator.ICreate,
      },
    );
  typia.assert(mod1Assignment);
  const mod2Assignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: moderator2Auth.id,
        } satisfies IRedditCloneModerator.ICreate,
      },
    );
  typia.assert(mod2Assignment);
  // 5. Test Scenario 1: is_owner=true should return only the community owner (exactly 1 result)
  const ownerOnlyResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          is_owner: true,
        } satisfies IRedditCloneModerator.IRequest,
      },
    );
  typia.assert(ownerOnlyResult);
  TestValidator.equals(
    "owner filter returns exactly 1 moderator",
    ownerOnlyResult.data.length,
    1,
  );
  TestValidator.predicate(
    "owner moderator has is_owner=true",
    ownerOnlyResult.data[0].is_owner === true,
  );
  TestValidator.equals(
    "owner filter pagination records",
    ownerOnlyResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "owner is the community creator",
    ownerOnlyResult.data[0].member.id,
    ownerAuth.id,
  );
  // 6. Test Scenario 2: is_owner=false should return only regular moderators (2 results, excluding owner)
  const regularModsResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          is_owner: false,
        } satisfies IRedditCloneModerator.IRequest,
      },
    );
  typia.assert(regularModsResult);
  TestValidator.equals(
    "regular mods filter returns 2 moderators",
    regularModsResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all regular mods have is_owner=false",
    regularModsResult.data.every((m) => m.is_owner === false),
  );
  TestValidator.equals(
    "regular mods filter pagination records",
    regularModsResult.pagination.records,
    2,
  );
  const regularModIds = regularModsResult.data.map((m) => m.member.id);
  TestValidator.predicate(
    "regular mods include moderator1",
    regularModIds.includes(moderator1Auth.id),
  );
  TestValidator.predicate(
    "regular mods include moderator2",
    regularModIds.includes(moderator2Auth.id),
  );
  // 7. Test Scenario 3: omitting is_owner should return all moderators (3 results total)
  const allModsResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          is_owner: undefined,
        } satisfies IRedditCloneModerator.IRequest,
      },
    );
  typia.assert(allModsResult);
  TestValidator.equals(
    "all mods filter returns 3 moderators",
    allModsResult.data.length,
    3,
  );
  TestValidator.equals(
    "all mods filter pagination records",
    allModsResult.pagination.records,
    3,
  );
  const ownerCount = allModsResult.data.filter(
    (m) => m.is_owner === true,
  ).length;
  const regularCount = allModsResult.data.filter(
    (m) => m.is_owner === false,
  ).length;
  TestValidator.equals("all mods has exactly 1 owner", ownerCount, 1);
  TestValidator.equals(
    "all mods has exactly 2 regular moderators",
    regularCount,
    2,
  );
  // 8. Validate pagination metadata reflects filtered counts correctly
  TestValidator.predicate(
    "owner only pagination current page is 1",
    ownerOnlyResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "regular mods pagination current page is 1",
    regularModsResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "all mods pagination current page is 1",
    allModsResult.pagination.current === 1,
  );
}
