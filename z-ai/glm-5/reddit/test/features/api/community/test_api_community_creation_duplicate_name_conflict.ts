import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test that creating a community with a duplicate name returns 409 Conflict.
 *
 * This test validates the business rule that community names must be globally
 * unique across the platform (case-insensitive). When a member attempts to
 * create a community with a name that already exists, the system should
 * return a 409 Conflict error.
 *
 * Steps:
 * 1. Register first member and create a community with a unique name
 * 2. Register second member with different credentials
 * 3. Attempt to create another community with the same name
 * 4. Verify 409 Conflict error is returned
 */
export async function test_api_community_creation_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(firstMember);
  // Step 2: Create first community with a unique name
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const firstCommunity =
    await api.functional.community.member.communities.create(
      firstMemberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // Step 3: Register second member with different credentials
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(secondMember);
  // Step 4: Attempt to create a community with the same name (should fail with 409)
  await TestValidator.httpError(
    "duplicate community name should return 409 Conflict",
    409,
    async () => {
      await api.functional.community.member.communities.create(
        secondMemberConnection,
        {
          body: {
            name: communityName,
            description: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityCommunity.ICreate,
        },
      );
    },
  );
}
