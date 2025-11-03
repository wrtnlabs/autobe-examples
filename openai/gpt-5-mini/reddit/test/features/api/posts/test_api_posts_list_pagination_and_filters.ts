import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";

export async function test_api_posts_list_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Create an authenticated community member (author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email: authorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "Passw0rd!",
        session_context: {
          href: "http://example.test/",
          referrer: "http://example.test/ref",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(author);

  // 2. Create a new community
  const now = Date.now();
  const communitySlug = `test-community-${now}`;
  const communityName = `Test Community ${now}`;
  const createdCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: "E2E test community for pagination and filters",
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  TestValidator.equals(
    "created community slug matches",
    createdCommunity.slug,
    communitySlug,
  );

  // 3. Create multiple posts (>=15) with mixed post_type values
  const TYPES = ["text", "link", "image"] as const;
  const TOTAL = 15;
  const createdPosts: ICommunityBbsPost[] = [];

  for (let i = 0; i < TOTAL; ++i) {
    const type = TYPES[i % TYPES.length];
    const title = RandomGenerator.paragraph({ sentences: 3 });
    const bodyText = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
    });

    if (type === "text") {
      const post =
        await api.functional.communityBbs.communityMember.communities.posts.create(
          connection,
          {
            communitySlug,
            body: {
              title,
              body: bodyText,
              post_type: "text",
            } satisfies ICommunityBbsPost.ICreate,
          },
        );
      typia.assert(post);
      createdPosts.push(post);
    } else if (type === "link") {
      const post =
        await api.functional.communityBbs.communityMember.communities.posts.create(
          connection,
          {
            communitySlug,
            body: {
              title,
              post_type: "link",
              link_url: typia.random<string & tags.Format<"uri">>(),
            } satisfies ICommunityBbsPost.ICreate,
          },
        );
      typia.assert(post);
      createdPosts.push(post);
    } else {
      // image
      const post =
        await api.functional.communityBbs.communityMember.communities.posts.create(
          connection,
          {
            communitySlug,
            body: {
              title,
              post_type: "image",
              // no media_ids attached for simplicity
            } satisfies ICommunityBbsPost.ICreate,
          },
        );
      typia.assert(post);
      createdPosts.push(post);
    }
  }

  TestValidator.predicate(
    "created at least 15 posts",
    createdPosts.length >= 15,
  );

  // 4. Request first page with limit=10
  const firstPage: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.communities.posts.index(connection, {
      communitySlug,
      body: {
        limit: 10,
      } satisfies ICommunityBbsPost.IRequest,
    });
  typia.assert(firstPage);

  TestValidator.equals(
    "first page limit is 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate("first page has items", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page size <= limit",
    firstPage.data.length <= 10,
  );

  const firstIds = firstPage.data.map((d) => d.id);

  // 5. Request second page using opaque cursor = last id of first page
  const lastIdOfFirst = firstIds[firstIds.length - 1];
  const secondPage: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.communities.posts.index(connection, {
      communitySlug,
      body: {
        limit: 10,
        cursor: lastIdOfFirst,
      } satisfies ICommunityBbsPost.IRequest,
    });
  typia.assert(secondPage);

  const secondIds = secondPage.data.map((d) => d.id);

  // Ensure no overlap between pages
  TestValidator.predicate(
    "no overlap between first and second page",
    secondIds.every((id) => !firstIds.includes(id)),
  );

  // Ensure continuity: union of first+second ids is subset of created posts
  const createdIds = createdPosts.map((p) => p.id);
  const unionIds = Array.from(new Set([...firstIds, ...secondIds]));
  TestValidator.predicate(
    "union of page ids are subset of created posts",
    unionIds.every((id) => createdIds.includes(id)),
  );

  // 6. Apply filter by post_type = 'link' and verify results
  const expectedLinkCount = createdPosts.filter(
    (p) => p.post_type === "link",
  ).length;
  const filtered: IPageICommunityBbsPost.ISummary =
    await api.functional.communityBbs.communities.posts.index(connection, {
      communitySlug,
      body: {
        post_type: "link",
        limit: 100,
      } satisfies ICommunityBbsPost.IRequest,
    });
  typia.assert(filtered);

  TestValidator.predicate(
    "filtered results honor post_type=link",
    filtered.data.every((d) => d.post_type === "link"),
  );

  // Because we created the posts earlier in this test, the returned filtered
  // count should match what we created (since limit is large enough)
  TestValidator.equals(
    "filtered count equals created link posts",
    filtered.data.length,
    expectedLinkCount,
  );
}
