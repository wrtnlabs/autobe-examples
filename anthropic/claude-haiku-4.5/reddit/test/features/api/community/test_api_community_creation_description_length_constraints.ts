import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community description length validation (0-500 characters).
 *
 * This test validates that the community creation API correctly enforces
 * description length constraints:
 *
 * 1. Empty description (0 chars) is valid
 * 2. Maximum length description (500 chars) is valid
 * 3. Description exceeding 500 chars fails with HTTP 400
 * 4. Description with markdown/special characters is accepted
 * 5. Null/undefined description is valid (optional field)
 *
 * Process:
 *
 * 1. Create administrator and member accounts
 * 2. Create a community category
 * 3. Test successful community creation with empty description
 * 4. Test successful community creation with 500-character description
 * 5. Test community creation with 501-character description (should fail)
 * 6. Test community creation with markdown-formatted description
 * 7. Test community creation with null description
 */
export async function test_api_community_creation_description_length_constraints(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: memberPassword,
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 3. Create a community category
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and programming discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Switch to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Test successful community creation with empty description
  const communityWithEmptyDesc = {
    name: "Empty Description Community",
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: "",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdEmptyDesc =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityWithEmptyDesc },
    );
  typia.assert(createdEmptyDesc);
  TestValidator.equals(
    "empty description accepted",
    createdEmptyDesc.description,
    "",
  );

  // 5. Test successful community creation with 500-character description (maximum valid)
  const maxDescription = "A".repeat(500);
  const communityWithMaxDesc = {
    name: "Max Length Description Community",
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: maxDescription,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdMaxDesc =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityWithMaxDesc },
    );
  typia.assert(createdMaxDesc);
  TestValidator.equals(
    "500-char description accepted",
    createdMaxDesc.description,
    maxDescription,
  );

  // 6. Test community creation with 501-character description (should fail)
  const overLimitDescription = "A".repeat(501);
  const communityWithOverLimitDesc = {
    name: "Over Limit Description Community",
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: overLimitDescription,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await TestValidator.error(
    "501-char description should fail with 400",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: communityWithOverLimitDesc,
        },
      );
    },
  );

  // 7. Test community creation with markdown-formatted description
  const markdownDescription = `# Community Guidelines\n\n## Topics\n- Technology discussions\n- Programming help\n\n**Please follow our rules:**\n1. Be respectful\n2. No spam\n3. Code examples are welcome\n\n> Quotes are helpful for emphasis`;

  const communityWithMarkdown = {
    name: "Markdown Description Community",
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: markdownDescription,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdMarkdown =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityWithMarkdown },
    );
  typia.assert(createdMarkdown);
  TestValidator.equals(
    "markdown description accepted",
    createdMarkdown.description,
    markdownDescription,
  );

  // 8. Test community creation with null description
  const communityWithNullDesc = {
    name: "Null Description Community",
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: null,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdNullDesc =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityWithNullDesc },
    );
  typia.assert(createdNullDesc);
  TestValidator.predicate(
    "null description is valid",
    createdNullDesc.description === null ||
      createdNullDesc.description === undefined ||
      createdNullDesc.description === "",
  );
}
