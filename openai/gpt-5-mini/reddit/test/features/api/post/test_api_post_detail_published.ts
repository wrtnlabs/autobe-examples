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

export async function test_api_post_detail_published(
  connection: api.IConnection,
) {
  // 1) Register alice (community member self-join)
  const aliceEmail = `alice.${Date.now()}@example.test`;
  const aliceUsername = `alice_${RandomGenerator.alphaNumeric(6)}`;
  const aliceAuth = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: aliceEmail,
      username: aliceUsername,
      password: "Passw0rd!A",
      display_name: "Alice Test",
      profile: {
        display_name: "Alice Test",
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_uri: null,
      },
      session_context: {
        href: "http://localhost/test",
        referrer: "http://localhost/ref",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(aliceAuth);

  // 2) Create community as alice
  const communitySlug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.paragraph({ sentences: 1 })}`,
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Upload media (optional) as alice
  const media =
    await api.functional.communityBbs.communityMember.uploads.create(
      connection,
      {
        body: {
          upload_mode: "url",
          url: typia.random<string & tags.Format<"uri">>(),
          media_type: "image/png",
          size_bytes: 12345,
          ordering: 0,
          community_bbs_post_id: null,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(media);

  // 4) Create published post referencing uploaded media
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

  // 5) Create unauthenticated connection for public GET
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 6) Retrieve post as public client
  const read = await api.functional.communityBbs.posts.at(publicConn, {
    postId: post.id,
  });
  typia.assert(read);

  // 7) Validate returned structure and business rules
  TestValidator.equals(
    "returned post id matches created post",
    read.id,
    post.id,
  );
  TestValidator.equals(
    "post community slug matches created community",
    read.community.slug,
    community.slug,
  );
  TestValidator.predicate("post is published", read.is_published === true);
  TestValidator.predicate("post has title", typeof read.title === "string");
  TestValidator.predicate(
    "post has post_type",
    typeof read.post_type === "string",
  );
  TestValidator.predicate(
    "post has score number",
    typeof read.score === "number",
  );
  TestValidator.predicate(
    "has upvotes number",
    typeof read.upvotes === "number",
  );
  TestValidator.predicate(
    "has downvotes number",
    typeof read.downvotes === "number",
  );
  TestValidator.predicate(
    "has comment_count number",
    typeof read.comment_count === "number",
  );
  TestValidator.predicate(
    "published_at present or null",
    read.published_at === null || typeof read.published_at === "string",
  );

  // Author summary must be safe
  TestValidator.predicate(
    "author summary exists",
    typeof read.author === "object" && read.author !== null,
  );
  TestValidator.predicate(
    "author summary does not expose email",
    !("email" in read.author),
  );
  TestValidator.predicate(
    "author summary does not expose password_hash",
    !("password_hash" in read.author),
  );

  // Media represented as metadata and matches expectation (we created one)
  TestValidator.predicate(
    "media represented as metadata array",
    Array.isArray(read.media) === true,
  );
  TestValidator.equals("media count equals one", (read.media ?? []).length, 1);
  if (Array.isArray(read.media) && read.media.length > 0) {
    TestValidator.predicate(
      "media[0] has url",
      typeof read.media[0].url === "string",
    );
    TestValidator.predicate(
      "media[0] has media_type",
      typeof read.media[0].media_type === "string",
    );
  }
}
