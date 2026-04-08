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
 * Test that creating a community with a duplicate name is rejected by business logic.
 *
 * Validates the global uniqueness constraint on community names across the platform. Two different member accounts attempt to create communities with the same name, where the first succeeds and the second is rejected with a 409 Conflict error.
 *
 * This test ensures that the community name uniqueness validation is properly enforced at the business logic level, preventing duplicate community names regardless of which member attempts to create them.
 *
 * 1. Create first member account with unique credentials.
 * 2. Create second member account with different unique credentials.
 * 3. First member creates a community with a specific name.
 * 4. Second member attempts to create a community with the identical name.
 * 5. Verify second creation fails with HttpError status 409 Conflict.
 * 6. Validate that community names must be globally unique across the platform.
 */
export async function test_api_community_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. First member creates a community with a specific name
  const communityName = `test-community-${RandomGenerator.alphabets(8)}`;
  const firstCommunity =
    await generate_random_reddit_like_member_communities_create(
      member1Connection,
      {
        body: {
          name: communityName,
          description: "Test community for duplicate name validation",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community name matches",
    firstCommunity.name,
    communityName,
  );
  // 4. Second member attempts to create a community with the identical name
  await TestValidator.httpError(
    "duplicate community name should be rejected with 409 Conflict",
    409,
    async () => {
      await generate_random_reddit_like_member_communities_create(
        member2Connection,
        {
          body: {
            name: communityName,
            description: "Attempt to create duplicate community",
          } satisfies IRedditLikeCommunity.ICreate,
        },
      );
    },
  );
  // 5. Verify the business rule: only one community with that name exists
  // (Implicitly validated - if duplicate was allowed, the test would not have thrown 409)
}
