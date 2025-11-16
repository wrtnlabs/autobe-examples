import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function test_api_member_user_profile_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<32>>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community as the authenticated member user
  const communityBody = {
    slug: typia.random<string & tags.MinLength<1> & tags.MaxLength<128>>(),
    name: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
    description: typia.random<(string & tags.MaxLength<4000>) | null>(),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Prepare profile update payload with all presentation fields set
  const updateBody = {
    tagline: RandomGenerator.paragraph({ sentences: 1 }),
    bio: RandomGenerator.paragraph({ sentences: 5 }),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    website_uri: typia.random<string & tags.Format<"uri">>(),
    show_total_karma: true,
    show_post_karma: false,
    show_comment_karma: true,
    is_profile_public: true,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  // 4. Execute profile update using the member user's username as handle
  const updatedProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.memberUser.profiles.update(
      connection,
      {
        handle: authorized.username,
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);

  // 5. Validate identity and immutable aspects
  TestValidator.predicate(
    "updated profile id must be non-empty string",
    updatedProfile.id.length > 0,
  );

  TestValidator.equals(
    "updated profile handle matches authorized username",
    updatedProfile.handle,
    authorized.username,
  );

  // 6. Validate that all mutable fields match the sent values
  TestValidator.equals(
    "tagline is updated as requested",
    updatedProfile.tagline,
    updateBody.tagline,
  );
  TestValidator.equals(
    "bio is updated as requested",
    updatedProfile.bio,
    updateBody.bio,
  );
  TestValidator.equals(
    "avatar_uri is updated as requested",
    updatedProfile.avatar_uri,
    updateBody.avatar_uri,
  );
  TestValidator.equals(
    "website_uri is updated as requested",
    updatedProfile.website_uri,
    updateBody.website_uri,
  );
  TestValidator.equals(
    "show_total_karma flag is updated as requested",
    updatedProfile.show_total_karma,
    updateBody.show_total_karma,
  );
  TestValidator.equals(
    "show_post_karma flag is updated as requested",
    updatedProfile.show_post_karma,
    updateBody.show_post_karma,
  );
  TestValidator.equals(
    "show_comment_karma flag is updated as requested",
    updatedProfile.show_comment_karma,
    updateBody.show_comment_karma,
  );
  TestValidator.equals(
    "is_profile_public flag is updated as requested",
    updatedProfile.is_profile_public,
    updateBody.is_profile_public,
  );
}
