import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
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
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test regular member access denial for community ban list.
 *
 * Validates that non-moderator members cannot access a community's ban list endpoint. The scenario creates an owner who establishes a community, registers a separate regular member, and verifies the regular member receives a 403 Forbidden error when attempting to access the ban list.
 *
 * 1. Owner registers and authenticates.
 * 2. Owner creates a community (becomes owner).
 * 3. Regular member registers separately.
 * 4. Regular member attempts to access ban list endpoint.
 * 5. Validates 403 Forbidden error is returned.
 */
export async function test_api_community_ban_list_access_denied_for_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Owner creates community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Regular member registers
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(regularMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(regularMember);
  // 4. Regular member attempts to access ban list
  await TestValidator.httpError(
    "regular member cannot access ban list",
    403,
    async () => {
      await api.functional.redditLike.member.communities.bans.index(
        regularMemberConnection,
        {
          communityId: community.id,
          body: {} satisfies IRedditLikeCommunityBan.IRequest,
        },
      );
    },
  );
}
