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

/**
 * Validate platform-admin subscription detail linkage across multiple member
 * users and communities.
 *
 * Business goal: Ensure GET
 * /communityPlatform/platformAdmin/subscriptions/{subscriptionId} returns a
 * subscription whose memberUser and community associations match the actual
 * owner and target community, even when multiple independent subscriptions
 * exist.
 *
 * End-to-end flow:
 *
 * 1. Create a platform admin via join.
 * 2. Create two member users (Member A, Member B) via join.
 * 3. As platform admin, create a community visibility level that both communities
 *    will use.
 * 4. As Member A, create Community A with the created visibility level.
 * 5. As Member B, create Community B with the same visibility level.
 * 6. As Member A, subscribe to Community A (Subscription A).
 * 7. As Member B, subscribe to Community B (Subscription B).
 * 8. As platform admin, fetch Subscription A by id using the platform-admin
 *    subscription detail endpoint and verify:
 *
 *    - Subscription.id === Subscription A id
 *    - Subscription.memberUser.id === Member A id
 *    - Subscription.community.id === Community A id
 * 9. As platform admin, fetch Subscription B by id and verify the analogous
 *    linkage for Member B and Community B.
 */
export async function test_api_platform_admin_subscription_detail_cross_community_and_user_linkage(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (establish admin actor and token)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join",
    referrer: "https://landing.test/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminId = platformAdminAuthorized.id;

  // 2. Member A and Member B join (two separate memberUser actors)
  const baseHref = "https://community.app.test";
  const baseReferrer = "https://referrer.app.test";

  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test.com`,
    password: "MemberAPassw0rd!",
    ip: "192.168.0.10",
    href: `${baseHref}/join-a`,
    referrer: `${baseReferrer}/campaign-a`,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);
  const memberAId = memberAAuthorized.id;

  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test.com`,
    password: "MemberBPassw0rd!",
    ip: "192.168.0.11",
    href: `${baseHref}/join-b`,
    referrer: `${baseReferrer}/campaign-b`,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);
  const memberBId = memberBAuthorized.id;

  // 3. As platform admin, create a community visibility level
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.test/login",
      referrer: "https://landing.test/login-ref",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 4. As Member A, create Community A
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAJoinBody.email,
      password: memberAJoinBody.password,
      ip: "192.168.0.10",
      href: `${baseHref}/login-a`,
      referrer: `${baseReferrer}/login-a`,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityAIdentifier = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: `Community A ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityACreateBody },
    );
  typia.assert(communityA);
  const communityAId = communityA.id;

  // 5. As Member B, create Community B
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberBJoinBody.email,
      password: memberBJoinBody.password,
      ip: "192.168.0.11",
      href: `${baseHref}/login-b`,
      referrer: `${baseReferrer}/login-b`,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityBIdentifier = `community-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: `Community B ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBCreateBody },
    );
  typia.assert(communityB);
  const communityBId = communityB.id;

  // 6. As Member A, subscribe to Community A
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAJoinBody.email,
      password: memberAJoinBody.password,
      ip: "192.168.0.10",
      href: `${baseHref}/login-a-subscribe`,
      referrer: `${baseReferrer}/login-a-subscribe`,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const subscriptionACreateBody = {
    community_id: communityAId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionACreateBody },
    );
  typia.assert(subscriptionA);
  const subscriptionAId = subscriptionA.id;

  // Basic sanity check: linkage from creation response
  TestValidator.equals(
    "subscription A memberUser summary id matches Member A",
    subscriptionA.memberUser.id,
    memberAId,
  );
  TestValidator.equals(
    "subscription A community summary id matches Community A",
    subscriptionA.community.id,
    communityAId,
  );

  // 7. As Member B, subscribe to Community B
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberBJoinBody.email,
      password: memberBJoinBody.password,
      ip: "192.168.0.11",
      href: `${baseHref}/login-b-subscribe`,
      referrer: `${baseReferrer}/login-b-subscribe`,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const subscriptionBCreateBody = {
    community_id: communityBId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBCreateBody },
    );
  typia.assert(subscriptionB);
  const subscriptionBId = subscriptionB.id;

  TestValidator.equals(
    "subscription B memberUser summary id matches Member B",
    subscriptionB.memberUser.id,
    memberBId,
  );
  TestValidator.equals(
    "subscription B community summary id matches Community B",
    subscriptionB.community.id,
    communityBId,
  );

  // 8. Switch back to platform admin to fetch subscription details
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.test/login-fetch",
      referrer: "https://landing.test/login-fetch-ref",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const fetchedSubA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.subscriptions.at(
      connection,
      { subscriptionId: subscriptionAId },
    );
  typia.assert(fetchedSubA);

  TestValidator.equals(
    "platform admin fetched subscription A id matches created subscription A id",
    fetchedSubA.id,
    subscriptionAId,
  );
  TestValidator.equals(
    "platform admin fetched subscription A memberUser.id matches Member A id",
    fetchedSubA.memberUser.id,
    memberAId,
  );
  TestValidator.equals(
    "platform admin fetched subscription A community.id matches Community A id",
    fetchedSubA.community.id,
    communityAId,
  );
  TestValidator.notEquals(
    "subscription A member user is not Member B",
    fetchedSubA.memberUser.id,
    memberBId,
  );
  TestValidator.notEquals(
    "subscription A community is not Community B",
    fetchedSubA.community.id,
    communityBId,
  );

  const fetchedSubB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.subscriptions.at(
      connection,
      { subscriptionId: subscriptionBId },
    );
  typia.assert(fetchedSubB);

  TestValidator.equals(
    "platform admin fetched subscription B id matches created subscription B id",
    fetchedSubB.id,
    subscriptionBId,
  );
  TestValidator.equals(
    "platform admin fetched subscription B memberUser.id matches Member B id",
    fetchedSubB.memberUser.id,
    memberBId,
  );
  TestValidator.equals(
    "platform admin fetched subscription B community.id matches Community B id",
    fetchedSubB.community.id,
    communityBId,
  );
  TestValidator.notEquals(
    "subscription B member user is not Member A",
    fetchedSubB.memberUser.id,
    memberAId,
  );
  TestValidator.notEquals(
    "subscription B community is not Community A",
    fetchedSubB.community.id,
    communityAId,
  );
}
