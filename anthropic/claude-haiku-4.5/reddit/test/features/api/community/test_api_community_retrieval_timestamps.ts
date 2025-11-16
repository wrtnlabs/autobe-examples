import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_retrieval_timestamps(
  connection: api.IConnection,
) {
  // Setup: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Record creation time before community creation
  const creationTime = new Date();

  // Step 1: Create community and immediately retrieve it
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Validate timestamp format (ISO 8601 UTC)
  const createdAtDate = new Date(community.created_at);
  const updatedAtDate = new Date(community.updated_at);

  TestValidator.predicate(
    "created_at should be valid ISO 8601 datetime",
    !isNaN(createdAtDate.getTime()),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO 8601 datetime",
    !isNaN(updatedAtDate.getTime()),
  );

  // Validate timestamps match ISO 8601 UTC format pattern
  TestValidator.predicate(
    "created_at should match ISO 8601 format with timezone",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(
      community.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at should match ISO 8601 format with timezone",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(
      community.updated_at,
    ),
  );

  // Validate created_at is within reasonable range of creation time (within 5 seconds)
  const timeDiff = Math.abs(createdAtDate.getTime() - creationTime.getTime());
  TestValidator.predicate(
    "created_at should be within 5 seconds of actual creation time",
    timeDiff < 5000,
  );

  // Validate created_at and updated_at are equal at creation (no prior updates)
  const timeGap = Math.abs(createdAtDate.getTime() - updatedAtDate.getTime());
  TestValidator.predicate(
    "updated_at should be equal to created_at at creation time",
    timeGap < 1000,
  );

  // Validate deleted_at is null for active community
  TestValidator.predicate(
    "deleted_at should be null for active community",
    community.deleted_at === null || community.deleted_at === undefined,
  );

  // Step 2: Retrieve the community and validate timestamp persistence
  const retrievedCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);

  // Validate timestamps are preserved on retrieval
  TestValidator.equals(
    "created_at should remain unchanged on retrieval",
    retrievedCommunity.created_at,
    community.created_at,
  );

  TestValidator.equals(
    "updated_at should remain unchanged on retrieval",
    retrievedCommunity.updated_at,
    community.updated_at,
  );

  // Validate deleted_at remains null
  TestValidator.predicate(
    "deleted_at should remain null on retrieval",
    retrievedCommunity.deleted_at === null ||
      retrievedCommunity.deleted_at === undefined,
  );

  // Validate timestamp consistency across retrievals
  TestValidator.predicate(
    "timestamps should maintain UTC timezone indicator",
    (community.created_at.endsWith("Z") ||
      /[+-]\d{2}:\d{2}$/.test(community.created_at)) &&
      (retrievedCommunity.created_at.endsWith("Z") ||
        /[+-]\d{2}:\d{2}$/.test(retrievedCommunity.created_at)),
  );
}
