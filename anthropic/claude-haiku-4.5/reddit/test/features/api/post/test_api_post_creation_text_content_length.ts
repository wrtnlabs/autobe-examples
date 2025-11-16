import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_creation_text_content_length(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPassword123!",
      username: RandomGenerator.alphabets(8),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Test text post with minimum valid content (1 character)
  const minimalPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: "a",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(minimalPost);
  TestValidator.equals(
    "minimal content text should be stored",
    minimalPost.content_text,
    "a",
  );
  TestValidator.equals(
    "minimal post type should be text",
    minimalPost.post_type,
    "text",
  );

  // 6. Test text post with maximum valid content (40,000 characters)
  const maxContent = RandomGenerator.content({
    paragraphs: 100,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const truncatedContent = maxContent.substring(0, 40000);
  const maxPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: truncatedContent,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(maxPost);
  TestValidator.equals(
    "max content length should be 40000",
    maxPost.content_text?.length,
    40000,
  );
  TestValidator.equals(
    "max post visibility should be public",
    maxPost.visibility_status,
    "public",
  );

  // 7. Test text post with markdown formatting
  const markdownContent = `# Heading
## Subheading
**bold text** and *italic text*
- bullet point 1
- bullet point 2
\`\`\`
code block
\`\`\``;
  const markdownPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: markdownContent,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(markdownPost);
  TestValidator.equals(
    "markdown content should be preserved",
    markdownPost.content_text,
    markdownContent,
  );

  // 8. Test link post with null content_text
  const linkPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_link_url: "https://example.com/article",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals(
    "link post should have null content_text",
    linkPost.content_text,
    null,
  );
  TestValidator.equals(
    "link post type should be link",
    linkPost.post_type,
    "link",
  );

  // 9. Test image post with null content_text
  const imagePost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  TestValidator.equals(
    "image post should have null content_text",
    imagePost.content_text,
    null,
  );
  TestValidator.equals(
    "image post type should be image",
    imagePost.post_type,
    "image",
  );

  // 10. Test post metrics initialization
  TestValidator.equals(
    "vote score should initialize to 0",
    minimalPost.vote_score,
    0,
  );
  TestValidator.equals(
    "upvote count should initialize to 0",
    minimalPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote count should initialize to 0",
    minimalPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment count should initialize to 0",
    minimalPost.comment_count,
    0,
  );

  // 11. Test post creator assignment
  TestValidator.equals(
    "post creator should match authenticated member",
    minimalPost.creator.id,
    member.id,
  );

  // 12. Test post community assignment
  TestValidator.equals(
    "post community should match specified community",
    minimalPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "post community identifier should match",
    minimalPost.community.identifier,
    community.identifier,
  );

  // 13. Test content exceeding maximum length should fail
  const excessContent = RandomGenerator.content({
    paragraphs: 150,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 40001);

  await TestValidator.error(
    "content exceeding 40000 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content_text: excessContent,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    },
  );
}
