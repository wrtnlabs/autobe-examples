import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_admin_moderator_appointment_success_junior(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account with system-wide moderator appointment authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: "admin_user",
      name: "Admin User",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a community creator account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: "community_creator",
      password: "CreatorPassword123!",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 3: Create a category required for community creation
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Community for technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to creator context and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "CreatorPassword123!",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: "tech_community",
          description: "A community for tech enthusiasts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create the target member account to be appointed as junior moderator
  const targetMemberEmail = typia.random<string & tags.Format<"email">>();
  const targetMember = await api.functional.auth.member.join(connection, {
    body: {
      email: targetMemberEmail,
      username: "target_moderator",
      password: "TargetPassword123!",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(targetMember);

  // Step 6: Switch back to administrator context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 7: Administrator appoints the target member as junior moderator
  const moderatorAppointment =
    await api.functional.communityPlatform.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);

  // Step 8: Validate the moderator appointment details
  TestValidator.equals(
    "moderator tier is junior",
    moderatorAppointment.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "community id matches",
    moderatorAppointment.community.id,
    community.id,
  );
  TestValidator.equals(
    "member id matches",
    moderatorAppointment.member.id,
    targetMember.id,
  );
  TestValidator.predicate(
    "removed_at should be null indicating active moderator",
    moderatorAppointment.removed_at === null,
  );
  TestValidator.predicate(
    "appointed_at should be a valid date",
    typeof moderatorAppointment.appointed_at === "string",
  );
  TestValidator.predicate(
    "moderator id should be a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorAppointment.id,
    ),
  );
}
