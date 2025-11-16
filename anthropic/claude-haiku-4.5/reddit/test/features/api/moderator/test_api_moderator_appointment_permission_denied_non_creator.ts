import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_moderator_appointment_permission_denied_non_creator(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: administratorEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category using administrator account
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create first member (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorMember = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "CreatorPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creatorMember);

  // 4. Create community with creator member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create second member (unauthorized regular member without moderator status)
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: unauthorizedEmail,
      username: RandomGenerator.alphabets(10),
      password: "UnauthorizedPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(unauthorizedMember);

  // 6. Create third member (target member to be appointed as moderator)
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetMember = await api.functional.auth.member.join(connection, {
    body: {
      email: targetEmail,
      username: RandomGenerator.alphabets(10),
      password: "TargetPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(targetMember);

  // 7. Switch to unauthorized member's account for permission testing
  await api.functional.auth.member.login(connection, {
    body: {
      email: unauthorizedEmail,
      password: "UnauthorizedPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 8. Verify 403 Forbidden error when unauthorized member attempts moderator appointment
  await TestValidator.httpError(
    "unauthorized non-creator member should receive 403 Forbidden when attempting to appoint moderator",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: targetMember.id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
}
