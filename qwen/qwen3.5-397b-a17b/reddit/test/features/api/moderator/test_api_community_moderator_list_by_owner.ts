import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function test_api_community_moderator_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (user A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a new community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create first moderator (user B)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorBAuth = await authorize_member_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorBAuth);
  // 4. Create second moderator (user C)
  const moderatorCConnection: api.IConnection = { host: connection.host };
  const moderatorCAuth = await authorize_member_join(moderatorCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorCAuth);
  // 5. Owner adds user B as moderator
  const moderatorBRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          member_id: moderatorBAuth.id,
        },
      },
    );
  typia.assert(moderatorBRecord);
  // 6. Owner adds user C as moderator
  const moderatorCRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          member_id: moderatorCAuth.id,
        },
      },
    );
  typia.assert(moderatorCRecord);
  // 7. Owner retrieves the moderator list
  const moderatorList =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "asc",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorList);
  // Validate pagination metadata
  TestValidator.equals("current page", moderatorList.pagination.current, 1);
  TestValidator.equals("total records", moderatorList.pagination.records, 2);
  TestValidator.equals("total pages", moderatorList.pagination.pages, 1);
  TestValidator.equals("limit", moderatorList.pagination.limit, 20);
  // Validate moderator list contains both moderators
  TestValidator.equals("moderator count", moderatorList.data.length, 2);
  // Validate both moderators are in the list
  const moderatorIds = moderatorList.data.map((m) => m.member.id);
  TestValidator.predicate("user B is in moderator list", () =>
    moderatorIds.includes(moderatorBAuth.id),
  );
  TestValidator.predicate("user C is in moderator list", () =>
    moderatorIds.includes(moderatorCAuth.id),
  );
  // Validate owner is NOT in the moderator list
  TestValidator.predicate(
    "owner is not in moderator list",
    () => !moderatorIds.includes(ownerAuth.id),
  );
  // Validate each moderator record has required fields
  for (const moderator of moderatorList.data) {
    TestValidator.predicate(
      "moderator has id",
      () => moderator.id !== undefined,
    );
    TestValidator.predicate(
      "moderator has member",
      () => moderator.member !== undefined,
    );
    TestValidator.predicate(
      "moderator has addedBy",
      () => moderator.addedBy !== undefined,
    );
    TestValidator.predicate(
      "moderator has createdAt",
      () => moderator.createdAt !== undefined,
    );
    // Validate addedBy is the owner (user A)
    TestValidator.equals(
      "addedBy is owner",
      moderator.addedBy.id,
      ownerAuth.id,
    );
  }
}
