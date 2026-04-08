import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
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
 * Test non-owner member receives 403 Forbidden when updating community.
 *
 * Validates the authorization check that ensures only community owners can modify their communities. The test creates two separate member accounts, where the first member creates a community and becomes its owner. The second member then attempts to update the first member's community using the same update endpoint. The system should reject this request with a 403 Forbidden response because the authenticated member is not the owner of the community.
 *
 * 1. Create first member account (owner) with random credentials.
 * 2. Create second member account (non-owner) with random credentials.
 * 3. First member creates a community using the creation endpoint.
 * 4. Second member attempts to update the community with new name and description.
 * 5. Validates the update request fails with 403 Forbidden error.
 */
export async function test_api_community_update_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditLikeMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(owner);
  // 2. Create non-owner member account
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner: IRedditLikeMember.IAuthorized = await authorize_member_join(
    nonOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(nonOwner);
  // 3. Owner creates a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // 4. Non-owner attempts to update the community (should fail with 403)
  await TestValidator.httpError(
    "non-owner cannot update community",
    403,
    async () => {
      await api.functional.redditLike.member.communities.update(
        nonOwnerConnection,
        {
          communityId: community.id,
          body: {
            name: `updated-community-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            icon_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IRedditLikeCommunity.IUpdate,
        },
      );
    },
  );
}
