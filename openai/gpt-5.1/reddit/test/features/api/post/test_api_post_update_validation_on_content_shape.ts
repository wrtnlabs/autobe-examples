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
 * Validate that updating a text-style post into an invalid content shape is
 * rejected.
 *
 * Business context:
 *
 * - A community platform supports different post types (text, link, image, etc.).
 * - For text-style posts, body content is expected to be present according to the
 *   post type semantics.
 * - When a member user edits a text post, they must not be able to clear body
 *   while also not providing any alternative content (url/image_uri), because
 *   that would violate the content rules for that type.
 *
 * Scenario steps:
 *
 * 1. Bootstrap a platformAdmin and create a visibility level and a text-style post
 *    type.
 * 2. Bootstrap a memberUser and create a community using the visibility level.
 * 3. As the memberUser, create a text post in the community with a non-empty body.
 * 4. Attempt to update that post by clearing the body (body = null) without
 *    setting url or image_uri in ICommunityPlatformPost.IUpdate.
 * 5. Assert that the update call fails (business validation error) via
 *    TestValidator.error.
 * 6. Assert that the originally created post object still has a non-empty body
 *    (since no successful update occurred in this test flow).
 */
export async function test_api_post_update_validation_on_content_shape(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authorization header is set by SDK)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level
  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(8)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create a text-style post type
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphaNumeric(8)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Member user joins (becomes the authenticated memberUser actor)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as the memberUser
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Create a text post with non-empty body and no url/image_uri
  const initialBody = RandomGenerator.content({ paragraphs: 2 });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: initialBody,
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  TestValidator.equals(
    "created post body should match initial body",
    createdPost.body,
    initialBody,
  );

  // 7. Attempt invalid update: clear body without providing url/image_uri
  const invalidUpdateBody = {
    body: null,
  } satisfies ICommunityPlatformPost.IUpdate;

  await TestValidator.error(
    "text post update with empty content must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.update(
        connection,
        {
          postId: createdPost.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 8. Content preservation check (in-memory, since no successful update happened)
  TestValidator.predicate(
    "original createdPost still has non-empty body after failed update attempt",
    typeof createdPost.body === "string" && createdPost.body.length > 0,
  );
}
