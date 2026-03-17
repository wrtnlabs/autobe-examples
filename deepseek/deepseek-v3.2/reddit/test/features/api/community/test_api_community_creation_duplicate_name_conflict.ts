import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test community creation fails when duplicate name exists.
 *
 * First, authenticate a member and create a community with a specific name.
 * Then authenticate a different member and attempt to create another community
 * with the same name. Expect the system to reject the second creation with a
 * 409 Conflict error, indicating the community name is already taken.
 * Validate that duplicate names are prevented regardless of which member
 * attempts creation. This tests business logic enforcement, not input validation.
 */
export async function test_api_community_creation_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for first member
  const firstMemberConnection: api.IConnection = { host: connection.host };
  // Register first member
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstMember);
  // Generate community name
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  // First member creates community
  const firstCommunity =
    await generate_random_community_platform_member_communities_create(
      firstMemberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "community name matches",
    firstCommunity.name,
    communityName,
  );
  // Create connection for second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  // Register second member
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondMember);
  // Second member attempts to create community with same name - should fail
  await TestValidator.httpError(
    "duplicate community name should return 409 Conflict",
    409,
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        secondMemberConnection,
        {
          body: {
            name: communityName,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
  // Validate second member is different from first member
  TestValidator.notEquals(
    "different member IDs",
    firstMember.id,
    secondMember.id,
  );
}
