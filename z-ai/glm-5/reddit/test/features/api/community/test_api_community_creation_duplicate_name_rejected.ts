import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
 * Test that creating a community with a duplicate name (case-insensitive) is rejected.
 *
 * This test validates the business logic that enforces community name uniqueness
 * across the platform. The uniqueness check is case-insensitive, so "TechDiscussion"
 * and "techdiscussion" are considered duplicates.
 *
 * Test Flow:
 * 1. Authenticate as a member
 * 2. Create first community with name "TechDiscussion"
 * 3. Attempt to create second community with name "techdiscussion" (same, different case)
 * 4. Verify the API rejects the duplicate name
 */
export async function test_api_community_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create the first community with name "TechDiscussion"
  const firstCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "TechDiscussion",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 3. Verify the first community was created with the correct name
  TestValidator.equals(
    "first community name",
    firstCommunity.name,
    "TechDiscussion",
  );
  // 4. Attempt to create a second community with the same name but different case
  // This should be rejected because name uniqueness is case-insensitive
  await TestValidator.error(
    "duplicate community name should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        memberConnection,
        {
          body: {
            name: "techdiscussion", // Same name, different case
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
