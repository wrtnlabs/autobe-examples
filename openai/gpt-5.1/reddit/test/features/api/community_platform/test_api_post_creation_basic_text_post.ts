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

/**
 * Validate that an authenticated member user can create a basic text post in an
 * existing community.
 *
 * Business workflow
 *
 * 1. Register a new memberUser via /auth/memberUser/join (implicit login).
 * 2. Register a platformAdmin via /auth/platformAdmin/join (implicit login) to
 *    create master data.
 * 3. As platformAdmin, create a community visibility level.
 * 4. As platformAdmin, create a text-style post type.
 * 5. Switch back to memberUser via /auth/memberUser/login.
 * 6. As memberUser, create a community that references the created visibility
 *    level.
 * 7. As memberUser, create a text post in that community using the created post
 *    type.
 * 8. Assert that the created post matches ICommunityPlatformPost and key business
 *    expectations for a text post: body filled, url/image_uri absent, correct
 *    community/author/postType associations, is_edited=false, and timestamps
 *    populated.
 */
export async function test_api_post_creation_basic_text_post(
  connection: api.IConnection,
) {
  // 1. Register memberUser (implicit authentication as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Register platformAdmin (implicit authentication as platformAdmin)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(18),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 3. As platformAdmin, create a community visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. As platformAdmin, create a text-style post type
  const postTypeCode = `text-${RandomGenerator.alphabets(5)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Simple text-only posts with content in body field.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  TestValidator.equals(
    "post type code should match input",
    postType.code,
    postTypeCode,
  );

  // 5. Switch back to memberUser via login so that /memberUser endpoints
  //    run under memberUser actor
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/join-complete",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoggedIn);

  TestValidator.equals(
    "logged-in member id should equal joined member id",
    memberLoggedIn.id,
    memberAuthorized.id,
  );

  // 6. As memberUser, create a community referencing the visibility level
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community creator id should equal member user id",
    community.creator.id,
    memberLoggedIn.id,
  );
  TestValidator.equals(
    "community visibility level code should match created visibility level",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 7. As memberUser, create a basic text post in that community
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: postTitle,
    body: postBody,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 8. Business assertions on created post
  TestValidator.equals(
    "post community id should match source community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post author id should equal member user id",
    post.author.id,
    memberLoggedIn.id,
  );
  TestValidator.equals(
    "post type id on post should match created text post type",
    post.postType.id,
    postType.id,
  );
  TestValidator.equals(
    "post.title should equal input title",
    post.title,
    postTitle,
  );
  TestValidator.equals(
    "post.body should equal input body",
    post.body ?? "",
    postBody,
  );
  TestValidator.predicate(
    "text post should not have url set",
    post.url === null || post.url === undefined,
  );
  TestValidator.predicate(
    "text post should not have image_uri set",
    post.image_uri === null || post.image_uri === undefined,
  );
  TestValidator.predicate(
    "newly created post should not be marked as edited",
    post.is_edited === false,
  );

  // Validate timestamps: created_at and updated_at should be valid date-time
  const createdAt = post.created_at;
  const updatedAt = post.updated_at;

  typia.assert<string & tags.Format<"date-time">>(createdAt);
  typia.assert<string & tags.Format<"date-time">>(updatedAt);

  const createdDate = new Date(createdAt);
  const updatedDate = new Date(updatedAt);

  TestValidator.predicate(
    "created_at should be a valid date",
    !Number.isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    !Number.isNaN(updatedDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be equal or after created_at",
    updatedDate.getTime() >= createdDate.getTime(),
  );
}
