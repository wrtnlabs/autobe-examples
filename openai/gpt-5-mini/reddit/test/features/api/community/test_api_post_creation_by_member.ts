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

export async function test_api_post_creation_by_member(
  connection: api.IConnection,
) {
  // 1) Register a new community member (self-join) and obtain authorization
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    display_name: RandomGenerator.name(),
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Ensure the member summary is present
  const member = authorized.member;
  typia.assert(member);

  // 2) Create a new community as the authenticated member
  // Use a unique slug to avoid collisions
  const uniqueSuffix = RandomGenerator.alphaNumeric(6);
  const communityBody = {
    name: `test-community-${uniqueSuffix}`,
    slug: `test-community-${uniqueSuffix}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
    post_approval_required: false,
    settings: {
      require_post_approval: false,
      max_images_per_post: 5,
      allowed_image_mime_types: ["image/jpeg", "image/png"],
    } satisfies ICommunityBbsCommunity.ISettings.ICreate,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3) Create a text post inside the created community
  const postRequest = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: postRequest,
      },
    );
  typia.assert(post);

  // 4) Business assertions and validations
  TestValidator.equals(
    "post title matches request",
    post.title,
    postRequest.title,
  );
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals(
    "post author id matches authenticated member",
    post.author.id,
    member.id,
  );
  TestValidator.equals(
    "post community id matches created community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post community slug matches created community",
    post.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "comment count initialized to zero",
    post.comment_count,
    0,
  );
  TestValidator.equals("initial score is zero", post.score, 0);

  // is_published should follow community.post_approval_required (we requested false)
  const expectedPublished =
    community.post_approval_required === true ? false : true;
  TestValidator.equals(
    "is_published follows community settings",
    post.is_published,
    expectedPublished,
  );

  // Timestamps & response shape already validated by typia.assert above
  TestValidator.predicate(
    "post has created_at timestamp",
    post.created_at !== undefined && post.created_at !== null,
  );

  // 5) Side-effects: audit / notifications are implementation details
  // Without direct DB access (Prisma not available in imports), verify presence
  // of expected identifiers that indicate persistence
  TestValidator.predicate(
    "post has authoritative id",
    typeof post.id === "string" && post.id.length > 0,
  );
  TestValidator.predicate(
    "community has authoritative id",
    typeof community.id === "string" && community.id.length > 0,
  );
}
