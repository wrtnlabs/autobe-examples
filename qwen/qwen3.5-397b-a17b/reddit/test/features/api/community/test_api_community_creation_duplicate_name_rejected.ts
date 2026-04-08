import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community creation duplicate name rejection business logic.
 *
 * Validates that the platform enforces global uniqueness of community names across all members. Two different members authenticate, and when the second member attempts to create a community with the same name as one created by the first member, the system rejects the request with 409 Conflict.
 *
 * This test ensures the unique constraint on community names is enforced at the business logic level, preventing naming conflicts regardless of which member is creating the community. The test verifies that community names are platform-wide unique, not just unique per user.
 *
 * 1. First member registers and authenticates using authorize_member_join utility.
 * 2. Second member registers and authenticates using authorize_member_join utility with different credentials.
 * 3. First member creates a community with a specific randomized name using generate_random_reddit_community_member_communities_create.
 * 4. Second member attempts to create a community with the exact same name.
 * 5. Validate that the duplicate name creation throws an HTTP error (409 Conflict).
 * 6. The test confirms community name uniqueness is enforced across all members platform-wide.
 */
export async function test_api_community_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member authentication
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Second member authentication with different credentials
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 3. First member creates a community with a specific name
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Second member attempts to create community with same name
  // 5. Validate that duplicate name is rejected with 409 Conflict
  await TestValidator.error("duplicate community name rejected", async () => {
    await api.functional.redditCommunity.member.communities.create(
      member2Connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  });
}
