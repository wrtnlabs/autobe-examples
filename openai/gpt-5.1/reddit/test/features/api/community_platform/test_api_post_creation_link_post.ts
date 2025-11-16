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
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_post_creation_link_post(
  connection: api.IConnection,
) {
  // 1. Register a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberId = memberAuthorizedFromJoin.id;
  const memberLoginIdentifier = memberAuthorizedFromJoin.email;
  const memberPassword = memberJoinBody.password;

  // 2. Optionally login the same member user to exercise login
  const memberLoginBody = {
    identifier: memberLoginIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  TestValidator.equals(
    "member id should be consistent between join and login",
    memberAuthorizedFromLogin.id,
    memberId,
  );

  // 3. Register a platform admin and ensure admin auth context
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  const platformAdminLoginBody = {
    identifier: platformAdminAuthorizedFromJoin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  TestValidator.equals(
    "platform admin id should be consistent between join and login",
    platformAdminAuthorizedFromLogin.id,
    platformAdminAuthorizedFromJoin.id,
  );

  // 4. Create a visibility level as platformAdmin
  const visibilityCode = `public_link_visibility_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Link Visibility",
    description: "Visibility level used for link post communities in tests",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code should match input",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 5. Create a link-style post type as platformAdmin
  const postTypeCreateBody = {
    code: "link",
    name: "Link Post",
    description:
      "Post type where the primary content is an external URL; body and image are optional.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  TestValidator.equals(
    "post type code should be 'link'",
    postType.code,
    postTypeCreateBody.code,
  );

  // 6. Switch back to memberUser context via login
  const memberReLoginBody = {
    identifier: memberLoginIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedForPosting: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberReLoginBody,
    });
  typia.assert(memberAuthorizedForPosting);

  TestValidator.equals(
    "member id after relogin should still match original",
    memberAuthorizedForPosting.id,
    memberId,
  );

  // 7. Create a community as memberUser using the created visibility level
  const communityIdentifier = `link-community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Link Post Test Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match input",
    community.identifier,
    communityCreateBody.identifier,
  );

  TestValidator.equals(
    "community visibility level code should match created visibility",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 8. Create a link-style post as memberUser
  const linkUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "External Article Link",
    body: null,
    url: linkUrl,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  // 9. Business invariants for link-style post
  TestValidator.equals(
    "created post should belong to the created community",
    createdPost.community.id,
    community.id,
  );

  TestValidator.equals(
    "created post postType.id should equal configured post type id",
    createdPost.postType.id,
    postType.id,
  );

  TestValidator.equals(
    "created post postType.code should be 'link'",
    createdPost.postType.code,
    "link",
  );

  TestValidator.equals(
    "created post url should match the input url",
    createdPost.url,
    postCreateBody.url,
  );

  TestValidator.equals(
    "created post body should be null for a pure link post",
    createdPost.body,
    null,
  );

  TestValidator.equals(
    "created post image_uri should be null when not provided",
    createdPost.image_uri,
    null,
  );

  TestValidator.equals(
    "created post author id should match the authenticated member user",
    createdPost.author.id,
    memberAuthorizedForPosting.id,
  );

  TestValidator.equals(
    "freshly created post should not be marked as edited",
    createdPost.is_edited,
    false,
  );
}
