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

export async function test_api_community_lookup_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Create a member account
  await authorize_member_join(memberConnection, {});
  // Create a community with specific name casing
  const communityName = "TechDiscussions";
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Test 1: Lookup with lowercase
  const lowercaseLookup = await api.functional.communityPlatform.communities.at(
    connection,
    { communityName: "techdiscussions" },
  );
  typia.assert(lowercaseLookup);
  TestValidator.equals(
    "lowercase lookup returns same community ID",
    lowercaseLookup.id,
    community.id,
  );
  TestValidator.equals(
    "original casing preserved in response",
    lowercaseLookup.name,
    communityName,
  );
  // Test 2: Lookup with uppercase
  const uppercaseLookup = await api.functional.communityPlatform.communities.at(
    connection,
    { communityName: "TECHDISCUSSIONS" },
  );
  typia.assert(uppercaseLookup);
  TestValidator.equals(
    "uppercase lookup returns same community ID",
    uppercaseLookup.id,
    community.id,
  );
  // Test 3: Lookup with mixed case
  const mixedCaseLookup = await api.functional.communityPlatform.communities.at(
    connection,
    { communityName: "techDiscussions" },
  );
  typia.assert(mixedCaseLookup);
  TestValidator.equals(
    "mixed case lookup returns same community ID",
    mixedCaseLookup.id,
    community.id,
  );
  // Verify all lookups return identical data
  TestValidator.equals(
    "lowercase and uppercase return same ID",
    lowercaseLookup.id,
    uppercaseLookup.id,
  );
  TestValidator.equals(
    "mixed case and original return same ID",
    mixedCaseLookup.id,
    community.id,
  );
}
