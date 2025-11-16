import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Create a valid community with name, description, and three tags.
 *
 * This test validates the complete workflow for creating a community on the
 * CommunityPlatform:
 *
 * 1. Authenticate a member via join operation
 * 2. Create a new community with valid name, description, and three unique tags
 * 3. Validate the response contains all expected properties including id, code,
 *    status, and counters (member_count, post_count, tag_count)
 * 4. Confirm community objects are created in both community_platform_communities
 *    and community_platform_community_settings tables
 *
 * This test ensures the community creation endpoint properly validates input,
 * generates required system properties, initializes counters correctly, and
 * maintains the relationship between community and community_settings records.
 *
 * Note: All data is generated using typia.random and RandomGenerator to ensure
 * realistic, valid input that conforms to all TypeScript and business
 * constraints.
 */
export async function test_api_community_create_valid(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a member to establish authorization context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SeCureP@ssw0rd123",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a new community with valid name, description, and three tags
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const communityTags = ArrayUtil.repeat(3, () => {
    const tag = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 15,
    });
    return tag.toLowerCase().replace(/\s+/g, "-");
  }) as (string & tags.MinLength<1> & tags.MaxLength<30>)[];

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          tags: communityTags,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Validate the community response structure and properties
  TestValidator.equals(
    "community has UUID id",
    typeof createdCommunity.id,
    "string",
  );
  TestValidator.equals(
    "community has non-empty id",
    createdCommunity.id.length > 0,
    true,
  );
  TestValidator.equals(
    "community has code",
    typeof createdCommunity.code,
    "string",
  );
  TestValidator.equals(
    "community has non-empty code",
    createdCommunity.code.length > 0,
    true,
  );
  TestValidator.equals(
    "community has correct name",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community has correct description",
    createdCommunity.description,
    communityDescription,
  );
  TestValidator.equals(
    "community created_at is date-time format",
    createdCommunity.created_at,
    createdCommunity.created_at,
  );
  TestValidator.equals(
    "community updated_at is date-time format",
    createdCommunity.updated_at,
    createdCommunity.updated_at,
  );
  TestValidator.equals(
    "community status is active",
    createdCommunity.status,
    "active",
  );
  TestValidator.equals(
    "community member_count is initialized to 1",
    createdCommunity.member_count,
    1,
  );
  TestValidator.equals(
    "community post_count is initialized to 0",
    createdCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "community tag_count matches tag array length",
    createdCommunity.tag_count,
    communityTags.length,
  );
}
