import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_slug_uniqueness(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create first category with slug 'technology'
  const category1: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and computing topics",
          icon_url: null,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category1);
  TestValidator.equals(
    "category1 slug is technology",
    category1.slug,
    "technology",
  );

  // 3. Verify category created successfully
  TestValidator.predicate(
    "category1 has valid id",
    () => category1.id.length > 0,
  );

  // 4-5. Attempt to create another category with same slug 'technology' - should fail with 409
  await TestValidator.httpError(
    "duplicate slug returns 409 Conflict",
    409,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Tech Category",
            slug: "technology",
            description: "Another technology category",
            icon_url: null,
            display_order: 2,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 6-7. Create category with similar but different slug 'technology2' - should succeed
  const category2: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology 2",
          slug: "technology2",
          description: "Advanced technology topics",
          icon_url: null,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category2);
  TestValidator.equals(
    "category2 slug is technology2",
    category2.slug,
    "technology2",
  );

  // 8. Test invalid slug formats - uppercase letters
  await TestValidator.httpError(
    "uppercase slug format rejected",
    400,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Invalid Uppercase",
            slug: "TECHNOLOGY",
            description: "Test uppercase",
            icon_url: null,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 9. Test invalid slug format - with spaces
  await TestValidator.httpError("slug with spaces rejected", 400, async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Invalid Spaces",
          slug: "tech nology",
          description: "Test spaces",
          icon_url: null,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // 10. Test invalid slug format - with underscores
  await TestValidator.httpError(
    "slug with underscores rejected",
    400,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Invalid Underscore",
            slug: "tech_nology",
            description: "Test underscore",
            icon_url: null,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 11. Test invalid slug format - with special characters
  await TestValidator.httpError(
    "slug with special characters rejected",
    400,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Invalid Special",
            slug: "tech@nology",
            description: "Test special chars",
            icon_url: null,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 12. Test invalid slug format - starting with hyphen
  await TestValidator.httpError(
    "slug starting with hyphen rejected",
    400,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Invalid Start Hyphen",
            slug: "-technology",
            description: "Test start hyphen",
            icon_url: null,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 13. Test invalid slug format - ending with hyphen
  await TestValidator.httpError(
    "slug ending with hyphen rejected",
    400,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Invalid End Hyphen",
            slug: "technology-",
            description: "Test end hyphen",
            icon_url: null,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 14. Test invalid slug format - empty slug
  await TestValidator.httpError("empty slug rejected", 400, async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Invalid Empty",
          slug: "",
          description: "Test empty slug",
          icon_url: null,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  });

  // 15. Test invalid slug format - too long
  const longSlug = RandomGenerator.alphabets(300);
  await TestValidator.httpError(
    "slug exceeding max length rejected",
    400,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Invalid Long",
            slug: longSlug,
            description: "Test long slug",
            icon_url: null,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 16. Test valid slug format - with hyphens
  const category3: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Science and Nature",
          slug: "science-and-nature",
          description: "Science and natural topics",
          icon_url: null,
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category3);
  TestValidator.equals(
    "category3 slug is valid with hyphens",
    category3.slug,
    "science-and-nature",
  );

  // 17. Test valid slug format - alphanumeric with numbers
  const category4: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Web 3 0",
          slug: "web3-0",
          description: "Web3 and blockchain topics",
          icon_url: null,
          display_order: 5,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category4);
  TestValidator.equals(
    "category4 slug is alphanumeric",
    category4.slug,
    "web3-0",
  );

  // 18. Test slug with consecutive hyphens
  await TestValidator.httpError(
    "slug with consecutive hyphens rejected",
    400,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: "Invalid Double Hyphen",
            slug: "tech--nology",
            description: "Test double hyphen",
            icon_url: null,
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );
}
