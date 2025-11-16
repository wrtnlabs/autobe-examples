import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberUserKarmasOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUserKarmasOverview";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserCommentKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCommentKarmas";
import type { ICommunityPlatformUserPostKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPostKarmas";
import type { ICommunityPlatformUserTotalKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserTotalKarmas";

export async function test_api_member_user_karmas_overview_for_low_activity_user(
  connection: api.IConnection,
) {
  // 1. Create a platform admin (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. As platform admin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public community",
    description: "Publicly visible community for low-activity karma test",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Create a low-activity member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. As member user, create a community
  const communityCreateBody = {
    identifier: `low-activity-${RandomGenerator.alphaNumeric(8)}`,
    title: "Low activity test community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. As member user, subscribe to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 6. Call karmas overview without authentication
  const unauthConnection: IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  const overview: ICommunityPlatformMemberUserKarmasOverview =
    await api.functional.communityPlatform.memberUsers.karmas.at(
      unauthConnection,
      {
        memberUserId,
      },
    );
  typia.assert<ICommunityPlatformMemberUserKarmasOverview>(overview);

  // 7. Business assertions for low-activity user
  // Ensure aggregates are for the correct member user
  TestValidator.equals(
    "total member_user_id matches member user id",
    overview.total.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "post member_user_id matches member user id",
    overview.post.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "comment member_user_id matches member user id",
    overview.comment.member_user_id,
    memberUserId,
  );

  // Ensure karma values are zero for low-activity user
  TestValidator.equals(
    "total.total_karma is zero for low-activity user",
    overview.total.total_karma,
    0,
  );
  TestValidator.equals(
    "total.post_karma is zero for low-activity user",
    overview.total.post_karma,
    0,
  );
  TestValidator.equals(
    "total.comment_karma is zero for low-activity user",
    overview.total.comment_karma,
    0,
  );
  TestValidator.equals(
    "post.post_karma is zero for low-activity user",
    overview.post.post_karma,
    0,
  );
  TestValidator.equals(
    "comment.comment_karma is zero for low-activity user",
    overview.comment.comment_karma,
    0,
  );

  // Stability check: reaching here without error implies no 404/5xx for zero-activity aggregates
}
