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
 * Validate that creating a community post without a proper title is rejected.
 *
 * Business context:
 *
 * - Posts are created by authenticated member users within a specific community
 *   and with a concrete post type.
 * - ICommunityPlatformPost.ICreate requires a non-empty `title` field. The
 *   backend should reject requests that omit `title` or provide it as an empty
 *   string, even if `community_id` and `post_type_id` are valid.
 *
 * End-to-end workflow:
 *
 * 1. Register a platform admin (join) to gain platform-level privileges.
 * 2. As platform admin, create a visibility level master record.
 * 3. As platform admin, create a post type master record (e.g., a text post type).
 * 4. Register a member user (join) who will act as the post author.
 * 5. As that member user, create a community that uses the visibility level
 *    created in step 2.
 * 6. As the same member user, attempt to create posts with:
 *
 *    - A valid community_id
 *    - A valid post_type_id
 *    - But invalid titles (empty string and whitespace-only strings).
 * 7. Assert that such invalid post creation calls fail.
 * 8. Finally, perform a control call by creating a valid post with a non-empty
 *    title to ensure that the setup is correct and that rejection is specific
 *    to invalid titles.
 */
export async function test_api_post_creation_missing_required_title(
  connection: api.IConnection,
) {
  // 1. Register a platform admin via join (also logs them in)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Public communities visible to all users.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platform admin
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Standard text-based post type for discussions.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 5. As member user, create a community that uses the created visibility level
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 6. Attempt to create a post with an empty string title.
  const invalidEmptyTitlePostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  await TestValidator.error(
    "creating a post with empty string title should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: invalidEmptyTitlePostCreateBody,
        },
      );
    },
  );

  // 7. Attempt to create a post with whitespace-only title.
  const invalidWhitespaceTitlePostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "   ",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  await TestValidator.error(
    "creating a post with whitespace-only title should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: invalidWhitespaceTitlePostCreateBody,
        },
      );
    },
  );

  // 8. Control: create a valid post with a non-empty title to ensure setup is correct.
  const validPostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const validPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: validPostCreateBody,
    });
  typia.assert(validPost);

  TestValidator.equals(
    "valid post should preserve title and community relationship",
    validPost.community.id,
    community.id,
  );
}
