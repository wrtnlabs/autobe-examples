import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsComment";

export async function test_api_comments_list_public_pagination(
  connection: api.IConnection,
) {
  // 1. Register a community member (will auto-set Authorization header on connection)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://localhost/",
        referrer: "http://localhost/",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community
  const communitySlug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.name(2)}`,
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
          post_approval_required: false,
          settings: {
            visibility: "public",
            require_post_approval: false,
            max_images_per_post: 5,
            allowed_image_mime_types: ["image/jpeg", "image/png"],
          } satisfies ICommunityBbsCommunity.ISettings.ICreate,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a published text post in the community
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Create multiple comments (15) on the post
  const createdComments = await ArrayUtil.asyncRepeat(15, async (i) => {
    const comment =
      await api.functional.communityBbs.communityMember.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 8 }),
          } satisfies ICommunityBbsComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });

  // Sanity: createdComments length
  TestValidator.equals("created 15 comments", createdComments.length, 15);

  // 5. Public (unauthenticated) client: copy connection with empty headers
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 6. Retrieve first page (limit=10, page=0) as public client
  const firstPage = await api.functional.communityBbs.posts.comments.index(
    publicConn,
    {
      postId: post.id,
      body: {
        page: 0,
        limit: 10,
        sort: "new",
      } satisfies ICommunityBbsComment.IRequest,
    },
  );
  typia.assert(firstPage);

  TestValidator.equals("first page has 10 items", firstPage.data.length, 10);
  TestValidator.equals(
    "pagination total records",
    firstPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "pagination limit reflected",
    firstPage.pagination.limit,
    10,
  );

  // 7. Retrieve second page (page=1)
  const secondPage = await api.functional.communityBbs.posts.comments.index(
    publicConn,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        sort: "new",
      } satisfies ICommunityBbsComment.IRequest,
    },
  );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page has remaining 5 items",
    secondPage.data.length,
    5,
  );

  // 8. Validate ordering: sort='new' should return newest first (created_at desc)
  const expectedOrder = [...createdComments]
    .sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
    )
    .map((c) => c.id);

  const combinedIds = [
    ...firstPage.data.map((d) => d.id),
    ...secondPage.data.map((d) => d.id),
  ];
  TestValidator.equals(
    "combined pages contain all comments in expected order",
    combinedIds,
    expectedOrder,
  );

  // 9. Spot-check that public summaries include required fields for first item
  const sample = firstPage.data[0];
  TestValidator.predicate("sample has id", typeof sample.id === "string");
  TestValidator.predicate(
    "sample has body_snippet",
    typeof sample.body_snippet === "string",
  );
  TestValidator.predicate(
    "sample has author summary",
    typeof sample.author?.id === "string",
  );
  TestValidator.predicate(
    "sample has created_at",
    typeof sample.created_at === "string",
  );
}
