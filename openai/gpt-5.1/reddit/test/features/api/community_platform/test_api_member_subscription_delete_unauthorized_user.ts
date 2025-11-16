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

export async function test_api_member_subscription_delete_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Register Member A (subscription owner)
  const memberAJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  const memberAId: string & tags.Format<"uuid"> = memberA.id;

  // 2. Register Member B (unauthorized actor)
  const memberBJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!456",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 3. Register a platform admin to configure community visibility
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminP@ssw0rd!",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 4. As platform admin, create a visibility level
  const visibilityCode = `vl_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code must match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 5. Switch to Member A context (login) and create a community
  const memberALoginBody = {
    identifier: memberAJoinBody.email,
    password: memberAJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // Create community as Member A using the visibility level code
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(10)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier must match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. As Member A, create a subscription for Member A to this community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberASubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberAId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(memberASubscription);

  TestValidator.equals(
    "subscription memberUserId must be Member A",
    memberASubscription.member_user_id,
    memberAId,
  );
  TestValidator.equals(
    "subscription community_id must be target community",
    memberASubscription.community_id,
    community.id,
  );

  // 7. Switch to Member B context (login)
  const memberBLoginBody = {
    identifier: memberBJoinBody.email,
    password: memberBJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  // 8. Attempt to delete Member A's subscription while authenticated as Member B
  await TestValidator.error(
    "member B cannot delete member A subscription",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.erase(
        connection,
        {
          memberUserId: memberAId,
          subscriptionId: memberASubscription.id,
        },
      );
    },
  );

  // 9. Optionally, ensure that Member B is still not the owner of the subscription
  TestValidator.notEquals(
    "member B id must differ from subscription owner",
    memberASubscription.member_user_id,
    memberB.id,
  );
}
