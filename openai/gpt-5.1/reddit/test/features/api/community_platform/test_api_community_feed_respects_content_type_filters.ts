import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFeed";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate that community-specific feeds respect content_type_codes filters.
 *
 * Business context: A community can have posts of various post types (e.g.,
 * text, link). The memberUser community feed endpoint exposes a
 * content_type_codes filter that should restrict which posts appear in the feed
 * based on their community_platform_post_types.code. This test ensures that
 * when a filter is applied, only posts whose post_type.code is in the requested
 * codes are returned, and that mixed-type content can be selectively
 * retrieved.
 *
 * Steps:
 *
 * 1. Create platformAdmin and configure a visibility level and two post types
 *    (e.g., text and link).
 * 2. Create a memberUser, then as that member create a community using the
 *    configured visibility level.
 * 3. As the same member, create multiple posts in that community across both text
 *    and link post types.
 * 4. Call the community feed with content_type_codes set to only the text code and
 *    assert that all returned posts are text-type and at least one exists.
 * 5. Call the community feed with only the link code and assert that all returned
 *    posts are link-type and at least one exists.
 * 6. Optionally, call the feed without content_type_codes and assert that both
 *    types appear, showing that filtering is opt-in.
 */
export async function test_api_community_feed_respects_content_type_filters(
  connection: api.IConnection,
) {
  // 1. Create a platform admin and configure visibility level + post types
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCreateBody = {
    code: "public",
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  const textPostTypeBody = {
    code: "text",
    name: "Text",
    description: "Text-based posts",
  } satisfies ICommunityPlatformPostType.ICreate;
  const textPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: textPostTypeBody },
    );
  typia.assert(textPostType);

  const linkPostTypeBody = {
    code: "link",
    name: "Link",
    description: "Link-based posts",
  } satisfies ICommunityPlatformPostType.ICreate;
  const linkPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: linkPostTypeBody },
    );
  typia.assert(linkPostType);

  // 2. Create a member user and a community
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(8),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create posts of both types in that community
  const textPosts: ICommunityPlatformPost[] = [];
  const linkPosts: ICommunityPlatformPost[] = [];

  const createTextPost = async (): Promise<void> => {
    const body = {
      community_id: community.id,
      post_type_id: textPostType.id,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.paragraph({ sentences: 10 }),
      url: null,
      image_uri: null,
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      { body },
    );
    typia.assert(post);
    textPosts.push(post);
  };

  const createLinkPost = async (): Promise<void> => {
    const body = {
      community_id: community.id,
      post_type_id: linkPostType.id,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: null,
      url: "https://example.com/" + RandomGenerator.alphabets(6),
      image_uri: null,
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      { body },
    );
    typia.assert(post);
    linkPosts.push(post);
  };

  await createTextPost();
  await createTextPost();
  await createLinkPost();
  await createLinkPost();

  TestValidator.predicate(
    "at least one text and one link post created",
    textPosts.length > 0 && linkPosts.length > 0,
  );

  // 4. Fetch feed filtered to text content_type_codes
  const textFeedRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: "new",
    time_range: undefined,
    content_type_codes: [textPostType.code],
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const textFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: textFeedRequest,
      },
    );
  typia.assert(textFeed);

  TestValidator.predicate(
    "text feed returns at least one post",
    textFeed.data.length > 0,
  );

  for (const item of textFeed.data) {
    TestValidator.equals(
      "all posts in text feed have text post_type.code",
      item.post_type.code,
      textPostType.code,
    );
  }

  // 5. Fetch feed filtered to link content_type_codes
  const linkFeedRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: "new",
    time_range: undefined,
    content_type_codes: [linkPostType.code],
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const linkFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: linkFeedRequest,
      },
    );
  typia.assert(linkFeed);

  TestValidator.predicate(
    "link feed returns at least one post",
    linkFeed.data.length > 0,
  );

  for (const item of linkFeed.data) {
    TestValidator.equals(
      "all posts in link feed have link post_type.code",
      item.post_type.code,
      linkPostType.code,
    );
  }

  // 6. Optional: fetch feed without content_type_codes to verify mixed content
  const mixedFeedRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_mode: "new",
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const mixedFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: mixedFeedRequest,
      },
    );
  typia.assert(mixedFeed);

  const mixedHasText = mixedFeed.data.some(
    (item) => item.post_type.code === textPostType.code,
  );
  const mixedHasLink = mixedFeed.data.some(
    (item) => item.post_type.code === linkPostType.code,
  );

  TestValidator.predicate(
    "mixed feed (no content_type_codes) contains at least one text post",
    mixedHasText,
  );
  TestValidator.predicate(
    "mixed feed (no content_type_codes) contains at least one link post",
    mixedHasLink,
  );
}
