import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_deletion_by_non_creator_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create first member (community creator)
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 2: Create category for community
  const adminConnection = { ...connection, headers: {} };
  const admin = await api.functional.auth.administrator.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community by first member (creator)
  const creatorConnection = { ...connection };
  creatorConnection.headers = {
    Authorization: creator.token.access,
  };

  const community =
    await api.functional.communityPlatform.member.communities.create(
      creatorConnection,
      {
        body: {
          name: "Tech Discussion Community",
          identifier: RandomGenerator.alphabets(12),
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator matches",
    community.creator.id,
    creator.id,
  );

  // Step 4: Create second member account (non-creator)
  const nonCreator = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(nonCreator);

  // Step 5: Attempt deletion by non-creator member
  const nonCreatorConnection = { ...connection };
  nonCreatorConnection.headers = {
    Authorization: nonCreator.token.access,
  };

  // Should fail with 403 Forbidden error
  await TestValidator.error(
    "non-creator should not be able to delete community",
    async () => {
      await api.functional.communityPlatform.member.communities.erase(
        nonCreatorConnection,
        {
          communityId: community.id,
        },
      );
    },
  );

  // Step 6: Verify creator can delete their own community
  const deletedCommunity =
    await api.functional.communityPlatform.member.communities.erase(
      creatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);
  TestValidator.predicate(
    "community should be soft-deleted",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );
}
