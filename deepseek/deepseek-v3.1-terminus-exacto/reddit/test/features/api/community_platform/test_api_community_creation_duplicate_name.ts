import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with duplicate name to validate uniqueness constraint
 * enforcement.
 *
 * This E2E test validates that the platform properly rejects community creation
 * attempts when the proposed community name already exists. The test creates
 * two member accounts, has the first member successfully create a community,
 * then attempts to create a community with the same name using the second
 * member account, expecting the operation to fail with appropriate error
 * handling.
 */
export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "password456",
      display_name: RandomGenerator.name(),
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 3: First member creates initial community
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const communitySlug = RandomGenerator.alphaNumeric(15);

  const firstCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "community name matches input",
    firstCommunity.name,
    communityName,
  );

  // Step 4: Authenticate as second member before community creation attempt
  await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "password456",
      display_name: secondMember.display_name,
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // Step 5: Second member attempts to create community with duplicate name
  await TestValidator.error(
    "duplicate community name should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: communityName, // Same name as first community
            slug: RandomGenerator.alphaNumeric(15), // Different slug
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
