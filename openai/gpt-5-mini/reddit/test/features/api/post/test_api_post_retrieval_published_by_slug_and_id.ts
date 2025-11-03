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

export async function test_api_post_retrieval_published_by_slug_and_id(
  connection: api.IConnection,
) {
  // 1) Create a community member (author) and obtain authorization
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const auth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        profile: { display_name: RandomGenerator.name() },
        session_context: {
          href: "https://example.test/welcome",
          referrer: "https://example.test",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(auth);

  // 2) Create a community with unique slug and ensure posts don't require approval
  const slug = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug,
          description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3) Upload media using the 'url' variant
  const media: ICommunityBbsPostMedia =
    await api.functional.communityBbs.communityMember.uploads.create(
      connection,
      {
        body: {
          upload_mode: "url",
          url: typia.random<string & tags.Format<"uri">>(),
          media_type: "image/png",
          size_bytes: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<100000>
          >(),
          ordering: 0,
          community_bbs_post_id: null,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(media);

  // 4) Create a post in the community referencing the uploaded media
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: slug,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "image",
          media_ids: [media.id],
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 5) Retrieve the post as a public visitor (no auth) using a fresh connection
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const read: ICommunityBbsPost =
    await api.functional.communityBbs.communities.posts.at(publicConn, {
      communitySlug: slug,
      postId: post.id,
    });
  typia.assert(read);

  // Business validations
  TestValidator.equals("post id matches created post", read.id, post.id);
  TestValidator.equals(
    "community slug matches",
    read.community.slug,
    community.slug,
  );
  TestValidator.equals("title preserved", read.title, post.title);
  TestValidator.equals("post type preserved", read.post_type, post.post_type);
  TestValidator.predicate(
    "media array included and non-empty",
    Array.isArray(read.media) && read.media.length > 0,
  );
  TestValidator.equals(
    "first media url matches uploaded media",
    read.media![0].url,
    media.url,
  );
  TestValidator.equals(
    "first media type preserved",
    read.media![0].media_type,
    media.media_type,
  );
  TestValidator.equals(
    "first media ordering preserved",
    read.media![0].ordering,
    media.ordering,
  );
  TestValidator.equals(
    "first media size preserved",
    read.media![0].size_bytes,
    media.size_bytes,
  );

  // Author projection identity checks
  TestValidator.equals(
    "author username matches creator",
    read.author.username,
    auth.member.username,
  );
  TestValidator.predicate(
    "author has at least one public presentation field",
    (read.author.display_name !== null &&
      read.author.display_name !== undefined) ||
      typeof read.author.created_at === "string",
  );

  // Publication visibility check: published and visible to public
  TestValidator.predicate(
    "post is published and has published_at",
    read.is_published === true &&
      read.published_at !== null &&
      read.published_at !== undefined,
  );

  // Soft-delete check: public callers should see active posts
  TestValidator.predicate(
    "post not soft-deleted",
    read.deleted_at === null || read.deleted_at === undefined,
  );
}
