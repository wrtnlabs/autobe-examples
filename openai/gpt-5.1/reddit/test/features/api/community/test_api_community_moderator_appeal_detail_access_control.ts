import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_community_moderator_appeal_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Create main actors: moderators, members, platform admin
  // 1-1. Create Moderator A
  const moderatorAPassword = RandomGenerator.alphaNumeric(12);
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();

  const moderatorAJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: moderatorAEmail,
        password: moderatorAPassword,
        display_name: RandomGenerator.name(2),
        ip: null,
        href: "https://moderator-a.example.com/join",
        referrer: "https://referrer.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAJoin,
  );

  // 1-2. Create Moderator B
  const moderatorBPassword = RandomGenerator.alphaNumeric(12);
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();

  const moderatorBJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: moderatorBEmail,
        password: moderatorBPassword,
        display_name: RandomGenerator.name(2),
        ip: null,
        href: "https://moderator-b.example.com/join",
        referrer: "https://referrer.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorBJoin,
  );

  // 1-3. Create Member User 1
  const memberUser1Password = RandomGenerator.alphaNumeric(10);
  const memberUser1Email = typia.random<string & tags.Format<"email">>();

  const memberUser1Join = await api.functional.auth.memberUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: memberUser1Email,
        password: memberUser1Password,
        ip: null,
        href: "https://member1.example.com/join",
        referrer: "https://referrer.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser1Join);

  // 1-4. Create Member User 2
  const memberUser2Password = RandomGenerator.alphaNumeric(10);
  const memberUser2Email = typia.random<string & tags.Format<"email">>();

  const memberUser2Join = await api.functional.auth.memberUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: memberUser2Email,
        password: memberUser2Password,
        ip: null,
        href: "https://member2.example.com/join",
        referrer: "https://referrer.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser2Join);

  // 1-5. Create Platform Admin
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(2),
        ip: "127.0.0.1",
        href: "https://platform-admin.example.com/join",
        referrer: "https://platform-admin.example.com",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 2. As platformAdmin, create a visibility level
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://platform-admin.example.com/login",
      referrer: "https://platform-admin.example.com",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(6)}`,
          name: "Public Visibility",
          description:
            "Visibility level for public communities created in tests.",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);

  // 3. As Member User 1, create Community 1
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberUser1Email,
      password: memberUser1Password,
      ip: null,
      href: "https://member1.example.com/login",
      referrer: "https://member1.example.com",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const community1 =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(8)}`,
          title: "Community One",
          description: "First community for moderator A scope.",
          visibilityLevelCode: visibility.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community1);

  // 4. As Member User 2, create Community 2
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberUser2Email,
      password: memberUser2Password,
      ip: null,
      href: "https://member2.example.com/login",
      referrer: "https://member2.example.com",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const community2 =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(8)}`,
          title: "Community Two",
          description: "Second community for moderator B scope.",
          visibilityLevelCode: visibility.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community2);

  TestValidator.notEquals(
    "two communities must be distinct",
    community1.id,
    community2.id,
  );

  // 5. As Member User 1, create Report 1 for Community 1
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberUser1Email,
      password: memberUser1Password,
      ip: null,
      href: "https://member1.example.com/login",
      referrer: "https://member1.example.com",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const report1 =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: community1.id,
          severity: "low",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(report1);

  // 6. As Member User 1, create Appeal 1 for Report 1
  const appeal1 =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report1.id,
        body: {
          appeal_scope: "content",
          reason_summary: "Please reconsider",
          details: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appeal1);

  // 7. As Member User 2, create Report 2 for Community 2 and Appeal 2
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberUser2Email,
      password: memberUser2Password,
      ip: null,
      href: "https://member2.example.com/login",
      referrer: "https://member2.example.com",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const report2 =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: community2.id,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(report2);

  const appeal2 =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report2.id,
        body: {
          appeal_scope: "content",
          reason_summary: "Appeal for second community",
          details: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appeal2);

  // 8. As Moderator A, create a moderation action scoped to Community 1
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorAEmail,
      password: moderatorAPassword,
      ip: null,
      href: "https://moderator-a.example.com/login",
      referrer: "https://moderator-a.example.com",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const action1 =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          community_id: community1.id,
          action_type: "no_action",
          target_scope: "community",
          reason_summary: "Context for appeal 1",
          notes_internal: "Test moderation action for community 1",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(action1);

  // 9. As Moderator B, create a moderation action scoped to Community 2
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorBEmail,
      password: moderatorBPassword,
      ip: null,
      href: "https://moderator-b.example.com/login",
      referrer: "https://moderator-b.example.com",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const action2 =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          community_id: community2.id,
          action_type: "no_action",
          target_scope: "community",
          reason_summary: "Context for appeal 2",
          notes_internal: "Test moderation action for community 2",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(action2);

  // 10. As Moderator A, GET appeal1 (in-scope) should succeed
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorAEmail,
      password: moderatorAPassword,
      ip: null,
      href: "https://moderator-a.example.com/login",
      referrer: "https://moderator-a.example.com",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const fetchedAppeal1 =
    await api.functional.communityPlatform.communityModerator.appeals.at(
      connection,
      {
        appealId: appeal1.id,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(fetchedAppeal1);

  TestValidator.equals(
    "moderator A can access in-scope appeal",
    fetchedAppeal1.id,
    appeal1.id,
  );

  // 11. As Moderator A, GET appeal2 (out-of-scope) should fail
  await TestValidator.error(
    "moderator A cannot access out-of-scope appeal",
    async () => {
      await api.functional.communityPlatform.communityModerator.appeals.at(
        connection,
        {
          appealId: appeal2.id,
        },
      );
    },
  );

  // 12. Unauthenticated access should fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot access appeal detail",
    async () => {
      await api.functional.communityPlatform.communityModerator.appeals.at(
        unauthConnection,
        {
          appealId: appeal1.id,
        },
      );
    },
  );
}
