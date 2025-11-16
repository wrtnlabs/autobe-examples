import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function test_api_member_user_profile_update_visibility_and_public_access_control(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community to ensure profile existence and a realistic member context
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // Derive handle from the authorized member user's username
  const handle: string = authorized.username;

  // 3. First profile update: set is_profile_public to false
  const firstUpdateBody = {
    tagline: RandomGenerator.paragraph({ sentences: 1 }),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    avatar_uri:
      "https://cdn.example.com/avatar/" + RandomGenerator.alphaNumeric(16),
    website_uri: "https://" + RandomGenerator.alphaNumeric(8) + ".example.org",
    show_total_karma: true,
    show_post_karma: true,
    show_comment_karma: true,
    is_profile_public: false,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const firstProfile =
    await api.functional.communityPlatform.memberUser.profiles.update(
      connection,
      {
        handle,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformUserProfile>(firstProfile);

  // Validate first update outcome
  TestValidator.equals(
    "profile handle should match authorized username on first update",
    firstProfile.handle,
    handle,
  );
  TestValidator.equals(
    "profile is_profile_public should be false after first update",
    firstProfile.is_profile_public,
    false,
  );
  TestValidator.equals(
    "profile tagline should match first update payload",
    firstProfile.tagline,
    firstUpdateBody.tagline,
  );
  TestValidator.equals(
    "profile bio should match first update payload",
    firstProfile.bio,
    firstUpdateBody.bio,
  );
  TestValidator.equals(
    "profile avatar_uri should match first update payload",
    firstProfile.avatar_uri,
    firstUpdateBody.avatar_uri,
  );
  TestValidator.equals(
    "profile website_uri should match first update payload",
    firstProfile.website_uri,
    firstUpdateBody.website_uri,
  );
  TestValidator.equals(
    "profile show_total_karma should match first update payload",
    firstProfile.show_total_karma,
    firstUpdateBody.show_total_karma,
  );
  TestValidator.equals(
    "profile show_post_karma should match first update payload",
    firstProfile.show_post_karma,
    firstUpdateBody.show_post_karma,
  );
  TestValidator.equals(
    "profile show_comment_karma should match first update payload",
    firstProfile.show_comment_karma,
    firstUpdateBody.show_comment_karma,
  );

  // 4. Second profile update: toggle is_profile_public to true and change other fields
  const secondUpdateBody = {
    tagline: RandomGenerator.paragraph({ sentences: 1 }),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_uri:
      "https://cdn.example.com/avatar/" + RandomGenerator.alphaNumeric(16),
    website_uri: "https://" + RandomGenerator.alphaNumeric(10) + ".example.net",
    show_total_karma: false,
    show_post_karma: false,
    show_comment_karma: true,
    is_profile_public: true,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const secondProfile =
    await api.functional.communityPlatform.memberUser.profiles.update(
      connection,
      {
        handle,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformUserProfile>(secondProfile);

  // Validate second update outcome
  TestValidator.equals(
    "profile handle should remain stable after second update",
    secondProfile.handle,
    handle,
  );
  TestValidator.equals(
    "profile is_profile_public should be true after second update",
    secondProfile.is_profile_public,
    true,
  );
  TestValidator.equals(
    "profile tagline should match second update payload",
    secondProfile.tagline,
    secondUpdateBody.tagline,
  );
  TestValidator.equals(
    "profile bio should match second update payload",
    secondProfile.bio,
    secondUpdateBody.bio,
  );
  TestValidator.equals(
    "profile avatar_uri should match second update payload",
    secondProfile.avatar_uri,
    secondUpdateBody.avatar_uri,
  );
  TestValidator.equals(
    "profile website_uri should match second update payload",
    secondProfile.website_uri,
    secondUpdateBody.website_uri,
  );
  TestValidator.equals(
    "profile show_total_karma should match second update payload",
    secondProfile.show_total_karma,
    secondUpdateBody.show_total_karma,
  );
  TestValidator.equals(
    "profile show_post_karma should match second update payload",
    secondProfile.show_post_karma,
    secondUpdateBody.show_post_karma,
  );
  TestValidator.equals(
    "profile show_comment_karma should match second update payload",
    secondProfile.show_comment_karma,
    secondUpdateBody.show_comment_karma,
  );

  // 5. Ensure updated_at has moved forward or stayed the same (monotonic)
  const firstUpdatedAt = new Date(firstProfile.updated_at).getTime();
  const secondUpdatedAt = new Date(secondProfile.updated_at).getTime();

  TestValidator.predicate(
    "second profile updated_at should be greater than or equal to first updated_at",
    secondUpdatedAt >= firstUpdatedAt,
  );
}
