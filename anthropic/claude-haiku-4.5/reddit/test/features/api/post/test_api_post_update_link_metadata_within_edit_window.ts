import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_update_link_metadata_within_edit_window(
  connection: api.IConnection,
) {
  // 1. Administrator creates a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology related discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Administrator joins the platform
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!",
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Member joins the platform
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "MemberPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: `tech_news_${RandomGenerator.alphaNumeric(6)}`,
          description: "Latest technology news and updates",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_links",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member creates a link post with Open Graph metadata
  const linkPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Interesting Article",
        content_link_url: "https://example.com/article",
        content_link_title: "Original Article Title",
        content_link_description: "This is the original description",
        content_link_thumbnail_url: "https://example.com/thumbnail.jpg",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals(
    "created link post has correct type",
    linkPost.post_type,
    "link",
  );
  TestValidator.equals(
    "initial link title matches",
    linkPost.content_link_title,
    "Original Article Title",
  );

  // 6. Member updates the link post metadata within edit window
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: linkPost.id,
      body: {
        title: "Updated Article Title",
        content_link_description: "This is the updated description",
        content_link_thumbnail_url: "https://example.com/new-thumbnail.jpg",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // 7. Validate the metadata updates are reflected
  TestValidator.equals(
    "post title was updated",
    updatedPost.title,
    "Updated Article Title",
  );
  TestValidator.equals(
    "link description was updated",
    updatedPost.content_link_description,
    "This is the updated description",
  );
  TestValidator.equals(
    "link thumbnail was updated",
    updatedPost.content_link_thumbnail_url,
    "https://example.com/new-thumbnail.jpg",
  );
  TestValidator.equals(
    "link URL remains unchanged",
    updatedPost.content_link_url,
    "https://example.com/article",
  );

  // 8. Test updating the link URL itself
  const urlUpdatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: linkPost.id,
      body: {
        content_link_url: "https://example.com/new-article",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(urlUpdatedPost);
  TestValidator.equals(
    "link URL was updated",
    urlUpdatedPost.content_link_url,
    "https://example.com/new-article",
  );

  // 9. Validate NSFW and spoiler flags can be updated
  const flaggedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: linkPost.id,
      body: {
        is_nsfw: true,
        has_spoiler: true,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(flaggedPost);
  TestValidator.predicate(
    "post is marked as NSFW",
    flaggedPost.is_nsfw === true,
  );
  TestValidator.predicate(
    "post is marked as spoiler",
    flaggedPost.has_spoiler === true,
  );
}
