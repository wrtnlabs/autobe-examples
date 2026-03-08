import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate community name and create 105+ moderators
  const communityName = `community_${RandomGenerator.alphaNumeric(6)}`;
  // Create first moderator (will be owner) and add 104 more moderators
  const moderatorCount = 105;
  // Create an owner user who can add moderators
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // Create owner-specific connection with authentication
  const ownerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: ownerAuth.token.access },
  };
  // Add 105 moderators using available endpoint
  for (let i = 0; i < moderatorCount; i++) {
    // Create temporary user as moderator
    const tempMemberAuth = await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: `mod_${RandomGenerator.alphaNumeric(6)}`,
          password: RandomGenerator.alphaNumeric(16),
          display_name: `Moderator ${i + 1}`,
          bio: null,
          avatar_url: null,
        } satisfies IRedditLikeMember.IJoin,
      },
    );
    // Add as moderator to community using correct API path
    const moderator =
      await api.functional.redditLike.member.communities.moderators.create(
        ownerAuthConnection,
        {
          communityName,
          body: {
            user_id: typia.random<string & tags.Format<"uuid">>(),
            community_id: typia.random<string & tags.Format<"uuid">>(),
            role: "moderator" satisfies IRedditLikeModeratorRole.ICreate["role"],
          } satisfies IRedditLikeModeratorRole.ICreate,
        },
      );
    typia.assert(moderator);
  }
  // Test pagination - first page
  const firstPage =
    await api.functional.redditLike.communities.moderators.index(
      ownerAuthConnection,
      {
        communityName,
        body: { limit: 10 },
      },
    );
  typia.assert(firstPage);
  // Validate first page
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page records", firstPage.pagination.records, 105);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 11);
  TestValidator.equals("first page has data", firstPage.data.length > 0, true);
  TestValidator.equals("first page count", firstPage.data.length, 10);
  // Test pagination - second page with cursor
  const secondPage =
    await api.functional.redditLike.communities.moderators.index(
      ownerAuthConnection,
      {
        communityName,
        body: { limit: 10, cursor: firstPage.data[9].id },
      },
    );
  typia.assert(secondPage);
  // Validate second page
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page has data",
    secondPage.data.length > 0,
    true,
  );
  TestValidator.equals("second page count", secondPage.data.length, 10);
  // Verify pagination metadata consistency
  TestValidator.equals(
    "total pages",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.equals(
    "page count matches",
    firstPage.pagination.pages,
    Math.ceil(105 / 10),
  );
}
