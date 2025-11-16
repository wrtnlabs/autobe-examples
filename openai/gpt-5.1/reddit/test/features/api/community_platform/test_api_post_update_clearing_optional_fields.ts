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

export async function test_api_post_update_clearing_optional_fields(
  connection: api.IConnection,
) {
  // 0. Helper to build unique-ish strings
  const randomSlug = () => RandomGenerator.alphaNumeric(8);

  // 1. Register and authenticate a platform admin to create visibility level and post type
  const platformAdminJoinBody = {
    username: `admin_${randomSlug()}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level configuration
  const visibilityCode = `public_${randomSlug()}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: `Public Level ${randomSlug()}`,
    description: "Visibility level used for E2E clearing optional fields test",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type that we will use for the post
  const postTypeCode = `generic_${randomSlug()}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Generic Post Type",
    description:
      "Generic post type used for testing clearing of url and image_uri fields via update DTO.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register a member user; join also authenticates as that memberUser
  const memberJoinBody = {
    username: `member_${randomSlug()}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword!123",
    ip: null,
    href: "https://app.client.local/join",
    referrer: "https://landing.client.local/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  // 5. Create a community as the memberUser using the previously created visibility level
  const communityIdentifier = `community_${randomSlug()}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community for clearing optional fields ${randomSlug()}`,
    description:
      "Community created specifically for testing post update semantics.",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a post with body, url, and image_uri all populated
  const initialTitle = `Initial title ${randomSlug()}`;
  const initialBody = RandomGenerator.paragraph({ sentences: 5 });
  const initialUrl = "https://example.com/article/" + randomSlug();
  const initialImageUri =
    "https://cdn.example.com/images/" + randomSlug() + ".png";

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: initialTitle,
    body: initialBody,
    url: initialUrl,
    image_uri: initialImageUri,
  } satisfies ICommunityPlatformPost.ICreate;

  const originalPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(originalPost);

  // Sanity checks on the original post
  TestValidator.equals(
    "original post title should match creation input",
    originalPost.title,
    initialTitle,
  );
  TestValidator.equals(
    "original post body should match creation input",
    originalPost.body,
    initialBody,
  );
  TestValidator.equals(
    "original post url should match creation input",
    originalPost.url,
    initialUrl,
  );
  TestValidator.equals(
    "original post image_uri should match creation input",
    originalPost.image_uri,
    initialImageUri,
  );

  // 7. Update the post to clear url and image_uri while leaving title/body intact
  const updateBody = {
    // title and body omitted on purpose to keep them unchanged
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.IUpdate;

  const updatedPost =
    await api.functional.communityPlatform.memberUser.posts.update(connection, {
      postId: originalPost.id,
      body: updateBody,
    });
  typia.assert(updatedPost);

  // 8. Validate id and non-cleared fields
  TestValidator.equals(
    "updated post should have the same id as original",
    updatedPost.id,
    originalPost.id,
  );
  TestValidator.equals(
    "title should remain unchanged after update that omits title",
    updatedPost.title,
    originalPost.title,
  );
  TestValidator.equals(
    "body should remain unchanged when body is omitted in update DTO",
    updatedPost.body,
    originalPost.body,
  );

  // 9. Validate clearing semantics for url and image_uri
  TestValidator.equals(
    "url should be cleared to null when update DTO passes url: null",
    updatedPost.url,
    null,
  );
  TestValidator.equals(
    "image_uri should be cleared to null when update DTO passes image_uri: null",
    updatedPost.image_uri,
    null,
  );

  // 10. Validate edit tracking and timestamps
  TestValidator.predicate(
    "updated post is_edited flag should be true after modifying content fields",
    updatedPost.is_edited === true,
  );

  // updated_at should advance relative to original updated_at. We assert that
  // the string value differs and that updated_at is not earlier than created_at.
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedPost.updated_at,
    originalPost.updated_at,
  );

  TestValidator.predicate(
    "updated_at must be on or after created_at",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(updatedPost.created_at).getTime(),
  );
}
