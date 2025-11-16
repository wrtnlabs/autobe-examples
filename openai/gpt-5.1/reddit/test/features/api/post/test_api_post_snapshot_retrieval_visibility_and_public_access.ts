import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_post_snapshot_retrieval_visibility_and_public_access(
  connection: api.IConnection,
) {
  // 1. PlatformAdmin setup - join as platform admin to configure visibility levels and post types
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create a public community visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "created visibility level code must match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create a text-style post type
  const postTypeCode = `text-${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);
  TestValidator.equals(
    "created post type code must match",
    postType.code,
    postTypeCode,
  );

  // 4. MemberUser registration (join)
  const memberEmail = `${RandomGenerator.alphabets(10)}@member.example.com`;
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail as string & tags.Format<"email">,
    password: "MemberPass123!",
    ip: "127.0.0.1",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);
  TestValidator.equals(
    "memberUser email must match join request",
    memberUser.email,
    memberEmail,
  );

  // 5. Create a community with public visibility as the member user
  const communityIdentifier = `comm-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
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
  TestValidator.equals(
    "community identifier must match",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility summary code must match created level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 6. Create a text post inside this community as the same member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);
  TestValidator.equals(
    "post community id must equal created community id",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post type id must equal created post type id",
    post.postType.id,
    postType.id,
  );

  // 7. Prepare a snapshotId (using random UUID as surrogate; in simulation mode this will work)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // 7.1 Guest (unauthenticated) connection: clone host but clear headers
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7.2 Retrieve snapshot as guest
  const guestSnapshot: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.posts.snapshots.at(guestConnection, {
      postId: post.id,
      snapshotId,
    });
  typia.assert<ICommunityPlatformPostSnapshot>(guestSnapshot);

  // Validate basic associations between snapshot and live post/community
  TestValidator.equals(
    "snapshot post_id must match parent post id",
    guestSnapshot.post_id,
    post.id,
  );
  TestValidator.equals(
    "snapshot community id must match post community id",
    guestSnapshot.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "snapshot author id must match post author id",
    guestSnapshot.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "snapshot post_type id must match post postType id",
    guestSnapshot.post_type.id,
    post.postType.id,
  );

  // 8. Retrieve the same snapshot as authenticated member user
  const memberSnapshot: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.posts.snapshots.at(connection, {
      postId: post.id,
      snapshotId,
    });
  typia.assert<ICommunityPlatformPostSnapshot>(memberSnapshot);

  // 8.3 Ensure that guest and member user see identical snapshot data
  TestValidator.equals(
    "snapshot payload must be identical for guest and member user",
    memberSnapshot,
    guestSnapshot,
  );
}
