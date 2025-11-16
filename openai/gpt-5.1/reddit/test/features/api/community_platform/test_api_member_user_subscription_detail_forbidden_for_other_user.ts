import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_member_user_subscription_detail_forbidden_for_other_user(
  connection: api.IConnection,
) {
  // 1. Register Member A with stable credentials
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAEmail = typia.random<string & tags.Format<"email">>();

  const memberAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: memberAEmail,
      password: memberAPassword,
      ip: null,
      href: "https://member-a.example.com/join",
      referrer: "https://member-a.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAJoin);

  const memberAId = memberAJoin.id;

  // 2. Register Member B with stable credentials
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBEmail = typia.random<string & tags.Format<"email">>();

  const memberBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: memberBEmail,
      password: memberBPassword,
      ip: null,
      href: "https://member-b.example.com/join",
      referrer: "https://member-b.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBJoin);

  // 3. Register Platform Admin (connection becomes admin)
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 4. Create a visibility level as platform admin
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 5. Login as Member A
  const memberALogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAEmail,
      password: memberAPassword,
      ip: null,
      href: "https://member-a.example.com/login",
      referrer: "https://member-a.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALogin);

  // 5-1. Create a community as Member A
  const communityCreateBody = {
    identifier: `comm-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Create a subscription for Member A to this community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberAId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  TestValidator.equals(
    "subscription belongs to member A",
    subscription.member_user_id,
    memberAId,
  );
  TestValidator.equals(
    "subscription community matches created community",
    subscription.community_id,
    community.id,
  );

  const subscriptionIdA = subscription.id;

  // 7. Login as Member B
  const memberBLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberBEmail,
      password: memberBPassword,
      ip: null,
      href: "https://member-b.example.com/login",
      referrer: "https://member-b.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBLogin);

  // 8. Negative access test: Member B tries to read Member A's subscription
  await TestValidator.error(
    "member B must not access subscription details of member A",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.at(
        connection,
        {
          memberUserId: memberAId,
          subscriptionId: subscriptionIdA,
        },
      );
    },
  );
}
