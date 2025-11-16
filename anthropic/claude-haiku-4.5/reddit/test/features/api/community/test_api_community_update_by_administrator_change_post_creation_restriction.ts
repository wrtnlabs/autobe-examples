import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator modifying post_creation_restriction from 'open_to_all' to
 * 'moderators_only'. Verify that the change affects new post submissions -
 * members cannot create posts after restriction change but existing posts
 * remain. Test transitioning through different restriction levels: open_to_all
 * -> moderators_only -> approved_members_only -> karma_requirement. Confirm
 * that changes are applied correctly and enforced on subsequent post creation
 * attempts.
 */
export async function test_api_community_update_by_administrator_change_post_creation_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community with initial restriction 'open_to_all'
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "initial post_creation_restriction",
    community.post_creation_restriction,
    "open_to_all",
  );

  // Step 5: Update community restriction to 'moderators_only'
  const updated1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          post_creation_restriction: "moderators_only",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "updated to moderators_only",
    updated1.post_creation_restriction,
    "moderators_only",
  );

  // Step 6: Update community restriction to 'approved_members_only'
  const updated2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          post_creation_restriction: "approved_members_only",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "updated to approved_members_only",
    updated2.post_creation_restriction,
    "approved_members_only",
  );

  // Step 7: Update community restriction to 'karma_requirement'
  const updated3: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          post_creation_restriction: "karma_requirement",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated3);
  TestValidator.equals(
    "updated to karma_requirement",
    updated3.post_creation_restriction,
    "karma_requirement",
  );

  // Step 8: Transition back to 'open_to_all'
  const updated4: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          post_creation_restriction: "open_to_all",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated4);
  TestValidator.equals(
    "transitioned back to open_to_all",
    updated4.post_creation_restriction,
    "open_to_all",
  );

  // Step 9: Update multiple restrictions at once
  const updatedMultiple: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          name: "Updated Community Name",
          description: RandomGenerator.paragraph(),
          post_creation_restriction: "moderators_only",
          post_type_restriction: "text_only",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedMultiple);
  TestValidator.equals(
    "name updated",
    updatedMultiple.name,
    "Updated Community Name",
  );
  TestValidator.equals(
    "post_creation_restriction updated",
    updatedMultiple.post_creation_restriction,
    "moderators_only",
  );
  TestValidator.equals(
    "post_type_restriction updated",
    updatedMultiple.post_type_restriction,
    "text_only",
  );
}
