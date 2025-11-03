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

export async function test_api_comment_public_retrieval(
  connection: api.IConnection,
) {
  // 1) Register a new community member (author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8); // satisfies ^[A-Za-z0-9_-]{3,21}$

  const authorAuth = await api.functional.auth.communityMember.join(
    connection,
    {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        profile: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 5 }),
        },
        session_context: {
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(authorAuth);

  // 2) Create a public community
  const uniqueSuffix = Date.now().toString();
  const communitySlug = `test-community-${uniqueSuffix}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
          post_approval_required: false,
          settings: {
            visibility: "public",
            require_post_approval: false,
            max_images_per_post: 5,
            allowed_image_mime_types: ["image/png", "image/jpeg"],
          } satisfies ICommunityBbsCommunity.ISettings.ICreate,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    communitySlug,
  );

  // 3) Optional: upload media for the post (use a small image payload metadata)
  const media =
    await api.functional.communityBbs.communityMember.uploads.create(
      connection,
      {
        body: {
          upload_mode: "url",
          url: typia.random<string & tags.Format<"uri">>(),
          media_type: "image/png",
          size_bytes: 1024,
          ordering: 0,
          community_bbs_post_id: null,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(media);

  // 4) Create a post in the community that references the media
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "image",
          media_ids: [media.id],
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.community_bbs_community_id,
    community.id,
  );

  // 5) Create a comment on the post as the author
  const createdComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(createdComment);
  TestValidator.equals(
    "created comment post linkage",
    createdComment.community_bbs_post_id,
    post.id,
  );

  // Lightweight persistence surrogate assertion: created_at should be present
  TestValidator.predicate(
    "created comment has created_at",
    typeof createdComment.created_at === "string",
  );

  // 6) Public retrieval (unauthenticated)
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const retrieved: ICommunityBbsComment =
    await api.functional.communityBbs.comments.at(publicConn, {
      commentId: createdComment.id,
    });
  typia.assert(retrieved);

  // Business assertions
  TestValidator.equals(
    "retrieved comment id matches",
    retrieved.id,
    createdComment.id,
  );
  TestValidator.equals(
    "retrieved comment body matches",
    retrieved.body,
    createdComment.body,
  );
  TestValidator.equals(
    "retrieved comment post id matches",
    retrieved.community_bbs_post_id,
    post.id,
  );
  TestValidator.predicate(
    "retrieved has author summary",
    retrieved.author !== null && typeof retrieved.author.username === "string",
  );

  TestValidator.predicate(
    "deleted_at is null or undefined and is_removed is falsy",
    (retrieved.deleted_at === null || retrieved.deleted_at === undefined) &&
      (retrieved.is_removed === false || retrieved.is_removed === undefined),
  );

  TestValidator.predicate(
    "score/upvotes/downvotes are numbers or undefined",
    (retrieved.score === undefined || typeof retrieved.score === "number") &&
      (retrieved.upvotes === undefined ||
        typeof retrieved.upvotes === "number") &&
      (retrieved.downvotes === undefined ||
        typeof retrieved.downvotes === "number"),
  );

  // Note: Direct Prisma DB verification is not performed here because the
  // provided test template imports did not include a Prisma client. The test
  // verifies persistence and consistency via the public SDK read API
  // (typia.assert on retrieved resource and the assertions above). If Prisma
  // client is available in the test environment, add a DB-level check in a
  // project-specific helper.
}
