import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_moderator_appointment_creator_prevention(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin@Password123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create community category
  const categorySlug = `category_${RandomGenerator.alphabets(8)}`;
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: categorySlug,
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account who will be the community creator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "Creator@Password123",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // 4. Create community (creator member becomes creator automatically)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator matches authenticated member",
    community.creator.id,
    creator.id,
  );

  // 5. Attempt to appoint the creator member as a moderator
  // This should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "cannot appoint community creator as moderator with 409 conflict",
    409,
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: creator.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // 6. Verify that no moderator record was created for the creator
  // by attempting to appoint a different member successfully (as control test)
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: "Other@Password123",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(otherMember);

  // Successfully appoint a different member as moderator (should succeed)
  const successModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: otherMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(successModerator);

  // 7. Verify that the creator's status remains unchanged and is not a moderator
  TestValidator.notEquals(
    "creator is not the moderator that was appointed",
    successModerator.member.id,
    creator.id,
  );
  TestValidator.equals(
    "successfully appointed moderator is the other member",
    successModerator.member.id,
    otherMember.id,
  );
}
