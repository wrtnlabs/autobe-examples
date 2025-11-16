import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_platformadmin_update_member_user_session_metadata_after_member_activity(
  connection: api.IConnection,
) {
  // 1. Register a new member user; this also authenticates the memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(), // schema does not enforce IP format
    href: "https://member.join.example.com/" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Create a separate connection for platformAdmin flows
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.join.example.com/" as string & tags.Format<"uri">,
    referrer: "https://admin.referrer.example.com/" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(adminConnection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platform admin, create a community visibility level
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(5)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      adminConnection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. As platform admin, create a post type
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphabets(5)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      adminConnection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 5. As member user, create a community using the configured visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  typia.assert(community);

  // 6. As member user, create a text post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Ensure admin connection is authenticated (optionally re-login)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: RandomGenerator.mobile(),
    href: "https://admin.login.example.com/" as string & tags.Format<"uri">,
    referrer: "https://admin.login.referrer.example.com/" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(adminConnection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. As platform admin, perform session metadata update for the member user
  const targetSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const firstUpdateBody = {
    is_revoked: true,
    revoked_reason: RandomGenerator.paragraph({ sentences: 5 }),
    expired_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformMemberuserSession.IUpdate;

  const updatedSession1: ICommunityPlatformMemberuserSession =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.update(
      adminConnection,
      {
        memberUserId: memberUserId,
        sessionId: targetSessionId,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedSession1);

  // 9. Perform a partial update to clear revoked_reason and leave other fields as-is
  const secondUpdateBody = {
    revoked_reason: null,
  } satisfies ICommunityPlatformMemberuserSession.IUpdate;

  const updatedSession2: ICommunityPlatformMemberuserSession =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.update(
      adminConnection,
      {
        memberUserId: memberUserId,
        sessionId: targetSessionId,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedSession2);

  // 10. Verify that a non-admin (unauthenticated) connection cannot update sessions
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection cannot update member user session",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.update(
        unauthConnection,
        {
          memberUserId: memberUserId,
          sessionId: targetSessionId,
          body: firstUpdateBody,
        },
      );
    },
  );
}
