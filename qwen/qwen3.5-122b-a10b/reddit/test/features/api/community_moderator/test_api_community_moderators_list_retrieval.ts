import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

export async function test_api_community_moderators_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community as owner
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create 3 moderator members
  const moderatorConnections: api.IConnection[] = [];
  const moderators: IRedditLikeMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const modConnection: api.IConnection = { host: connection.host };
    const mod = await authorize_member_join(modConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
    typia.assert(mod);
    moderators.push(mod);
    moderatorConnections.push(modConnection);
  }
  // 4. Add all moderators to the community
  const moderatorAssignments: IRedditLikeCommunityModerator[] = [];
  for (let i = 0; i < 3; i++) {
    const assignment =
      await generate_random_reddit_like_member_communities_moderators_create(
        ownerConnection,
        {
          body: {
            member_id: moderators[i].id,
          } satisfies IRedditLikeCommunityModerator.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    typia.assert(assignment);
    moderatorAssignments.push(assignment);
  }
  // 5. Retrieve moderators list
  const result: IPageIRedditLikeCommunityModerator.ISummary =
    await api.functional.redditLike.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    3,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    result.pagination.pages >= 1,
  );
  // 7. Validate moderator records exist and have correct count
  TestValidator.equals("moderator count matches", result.data.length, 3);
  // 8. Validate each moderator record structure
  for (let i = 0; i < result.data.length; i++) {
    const moderator = result.data[i];
    typia.assert(moderator);
    // Validate member summary structure
    TestValidator.predicate(
      "member has valid username",
      typeof moderator.member.username === "string",
    );
    TestValidator.predicate(
      "member has valid display_name",
      typeof moderator.member.display_name === "string",
    );
    TestValidator.predicate(
      "member has valid karma_score",
      typeof moderator.member.karma_score === "number",
    );
    // Validate community summary structure
    TestValidator.predicate(
      "community has valid id",
      typeof moderator.community.id === "string",
    );
    TestValidator.equals(
      "community matches created community",
      moderator.community.id,
      community.id,
    );
  }
  // 9. Validate ordering by created_at descending (newest first)
  for (let i = 0; i < result.data.length - 1; i++) {
    const current = new Date(result.data[i].created_at).getTime();
    const next = new Date(result.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `moderator ${i + 1} is newer than moderator ${i + 2}`,
      current >= next,
    );
  }
}
