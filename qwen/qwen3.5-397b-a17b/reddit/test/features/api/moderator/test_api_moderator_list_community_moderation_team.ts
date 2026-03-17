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

export async function test_api_moderator_list_community_moderation_team(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community (owner is automatically added as moderator with is_owner=true)
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
  // 3. Create additional members to add as moderators
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1Auth = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
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
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator2Auth);
  // 4. Add moderator1 to the community
  const moderator1Assignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderator1Auth.id,
        } satisfies IRedditCloneModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator1Assignment);
  // Wait a small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 5. Add moderator2 to the community
  const moderator2Assignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderator2Auth.id,
        } satisfies IRedditCloneModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator2Assignment);
  // 6. Retrieve the moderator list using community name
  const moderatorList =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCloneModerator.IRequest,
      },
    );
  typia.assert(moderatorList);
  // 7. Validate pagination metadata
  TestValidator.equals("current page", moderatorList.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    moderatorList.pagination.limit > 0,
  );
  TestValidator.equals("total records", moderatorList.pagination.records, 3); // owner + 2 moderators
  TestValidator.predicate(
    "total pages calculated correctly",
    moderatorList.pagination.pages >= 1,
  );
  // 8. Validate moderator list contains expected count
  TestValidator.equals("moderator count", moderatorList.data.length, 3);
  // 9. Validate each moderator has required fields
  for (const moderator of moderatorList.data) {
    // Validate moderator summary structure
    TestValidator.predicate("has valid id", moderator.id.length > 0);
    TestValidator.predicate(
      "is_owner is boolean",
      typeof moderator.is_owner === "boolean",
    );
    TestValidator.predicate("has created_at", moderator.created_at.length > 0);
    // Validate member details
    TestValidator.predicate("member has id", moderator.member.id.length > 0);
    TestValidator.predicate(
      "member has username",
      moderator.member.username.length > 0,
    );
    TestValidator.predicate(
      "member has display_name",
      moderator.member.display_name.length > 0,
    );
    TestValidator.predicate(
      "member has karma_score",
      typeof moderator.member.karma_score === "number",
    );
    TestValidator.predicate(
      "member has created_at",
      moderator.member.created_at.length > 0,
    );
  }
  // 10. Validate owner is present and marked as is_owner
  const ownerModerator = moderatorList.data.find(
    (m) => m.member.id === ownerAuth.id,
  );
  TestValidator.predicate(
    "owner is in moderator list",
    ownerModerator !== undefined,
  );
  TestValidator.equals(
    "owner has is_owner=true",
    ownerModerator!.is_owner,
    true,
  );
  // 11. Validate additional moderators are marked as is_owner=false
  const mod1 = moderatorList.data.find(
    (m) => m.member.id === moderator1Auth.id,
  );
  const mod2 = moderatorList.data.find(
    (m) => m.member.id === moderator2Auth.id,
  );
  TestValidator.predicate("moderator1 exists", mod1 !== undefined);
  TestValidator.predicate("moderator2 exists", mod2 !== undefined);
  TestValidator.equals("moderator1 is_owner=false", mod1!.is_owner, false);
  TestValidator.equals("moderator2 is_owner=false", mod2!.is_owner, false);
  // 12. Validate all moderators have valid created_at timestamps
  const timestamps = moderatorList.data.map((m) =>
    new Date(m.created_at).getTime(),
  );
  TestValidator.predicate(
    "all timestamps are valid",
    timestamps.every((ts) => !isNaN(ts)),
  );
}
