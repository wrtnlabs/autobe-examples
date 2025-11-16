import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_appointment_authorization_check(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://community.example.com/admin/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community creator member
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: creatorPassword,
        href: "https://community.example.com/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: `tech-${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create target member for appointment
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = RandomGenerator.alphaNumeric(12);
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: targetEmail,
        username: RandomGenerator.alphabets(8),
        password: targetPassword,
        href: "https://community.example.com/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(targetMember);

  // Step 6: Create junior moderator member
  const juniorModEmail = typia.random<string & tags.Format<"email">>();
  const juniorModPassword = RandomGenerator.alphaNumeric(12);
  const juniorModMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: juniorModEmail,
        username: RandomGenerator.alphabets(8),
        password: juniorModPassword,
        href: "https://community.example.com/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(juniorModMember);

  // Step 7: Create regular member
  const regularMemberEmail = typia.random<string & tags.Format<"email">>();
  const regularMemberPassword = RandomGenerator.alphaNumeric(12);
  const regularMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: regularMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: regularMemberPassword,
        href: "https://community.example.com/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(regularMember);

  // Step 8: Login as community creator and appoint junior moderator
  const creatorConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await api.functional.auth.member.login(creatorConn, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const juniorModeratorApptByCreator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.moderator.communities.moderators.create(
      creatorConn,
      {
        communityId: community.id,
        body: {
          memberId: juniorModMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModeratorApptByCreator);
  TestValidator.equals(
    "junior moderator appointed by creator",
    juniorModeratorApptByCreator.moderator_tier,
    "junior",
  );

  // Step 9: Switch to junior moderator and attempt to appoint (should fail)
  const juniorModConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await api.functional.auth.member.login(juniorModConn, {
    body: {
      email: juniorModEmail,
      password: juniorModPassword,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "junior moderator cannot appoint moderators",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.create(
        juniorModConn,
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

  // Step 10: Switch to regular member and attempt appointment (should fail)
  const regularMemberConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await api.functional.auth.member.login(regularMemberConn, {
    body: {
      email: regularMemberEmail,
      password: regularMemberPassword,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "regular member cannot appoint moderators",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.create(
        regularMemberConn,
        {
          communityId: community.id,
          body: {
            memberId: targetMember.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 11: Create and login as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorAccount: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://community.example.com/moderator/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  const moderatorConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await api.functional.auth.moderator.login(moderatorConn, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/moderator/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Moderator without community assignment should NOT be able to appoint
  await TestValidator.error(
    "moderator without community assignment cannot appoint",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.create(
        moderatorConn,
        {
          communityId: community.id,
          body: {
            memberId: targetMember.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 12: Switch to admin and verify admin CAN appoint
  const adminConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await api.functional.auth.administrator.login(adminConn, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://community.example.com/admin/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const seniorModeratorApptByAdmin: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.moderator.communities.moderators.create(
      adminConn,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModeratorApptByAdmin);
  TestValidator.equals(
    "senior moderator appointed by admin",
    seniorModeratorApptByAdmin.moderator_tier,
    "senior",
  );
}
