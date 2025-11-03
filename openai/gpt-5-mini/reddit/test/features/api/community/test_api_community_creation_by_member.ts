import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function test_api_community_creation_by_member(
  connection: api.IConnection,
) {
  // 1) Register a fresh communityMember and obtain authorized session
  const signupBody = {
    email: `test-${RandomGenerator.alphaNumeric(6)}@example.test`,
    username: `u${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    profile: {
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: null,
    },
    session_context: {
      href: "https://example.test/join",
      referrer: "https://example.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: signupBody,
    });
  typia.assert(authorized);

  // The SDK attaches the access token to connection.headers automatically.
  // 2) Prepare unique community creation payload
  const candidate =
    `test-community-${RandomGenerator.alphaNumeric(6)}-${Date.now()}`.toLowerCase();
  const createBody = {
    name: `Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
    slug: candidate,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    post_approval_required: false,
    settings: {
      visibility: "public",
      require_post_approval: false,
      max_images_per_post: 5,
      allowed_image_mime_types: ["image/jpeg", "image/png"],
    },
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(community);

  // 3) Business assertions
  TestValidator.equals(
    "members_count should be initialized to 0",
    community.members_count,
    0,
  );

  TestValidator.equals(
    "posts_count should be initialized to 0",
    community.posts_count,
    0,
  );

  TestValidator.equals(
    "community creator should match signup member",
    community.creator.id,
    authorized.member.id,
  );

  TestValidator.equals(
    "visibility should reflect provided value",
    community.visibility,
    createBody.visibility,
  );

  TestValidator.equals(
    "post_approval_required should reflect provided value",
    community.post_approval_required,
    createBody.post_approval_required,
  );

  TestValidator.predicate(
    "slug must be normalized to lowercase",
    community.slug === createBody.slug.toLowerCase(),
  );

  // 4) Basic side-effect inference: ensure created timestamps exist (typia.assert
  // already validated the presence and format). Use predicate to emphasize business
  // expectation that created_at is present and non-empty.
  TestValidator.predicate(
    "created_at must be present",
    typeof community.created_at === "string" && community.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be present",
    typeof community.updated_at === "string" && community.updated_at.length > 0,
  );
}
