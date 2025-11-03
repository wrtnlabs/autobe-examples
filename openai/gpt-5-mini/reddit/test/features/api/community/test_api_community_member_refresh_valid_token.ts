import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function test_api_community_member_refresh_valid_token(
  connection: api.IConnection,
) {
  // 1. Create a new community member (join)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8);
  const password = `Aa1${RandomGenerator.alphaNumeric(8)}`; // ensures uppercase, lowercase, digit, and length
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    email,
    username,
    password,
    profile: {
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: null,
    },
    session_context: {
      href,
      referrer,
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic assertions on join response
  TestValidator.predicate(
    "join returned token.access exists",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "join returned refresh token exists",
    typeof authorized.token?.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  typia.assert(authorized.member);
  typia.assert(authorized.session);

  // Save values for later checks
  const initialSession = authorized.session;
  const initialRefreshToken = authorized.token.refresh;

  // 2. Use initial access token to call protected endpoint: create a community
  const communityName = `test-community-${Date.now()}`;
  const communitySlug = communityName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");

  const communityBody = {
    name: communityName,
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    post_approval_required: false,
    settings: {
      visibility: "public",
      require_post_approval: false,
      max_images_per_post: 5,
      allowed_image_mime_types: ["image/jpeg", "image/png"],
    } satisfies ICommunityBbsCommunity.ISettings.ICreate,
  } satisfies ICommunityBbsCommunity.ICreate;

  const createdCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community slug matches request",
    createdCommunity.slug,
    communitySlug,
  );
  TestValidator.predicate(
    "created community has id",
    typeof createdCommunity.id === "string" && createdCommunity.id.length > 0,
  );

  // 3. Call refresh endpoint with the refresh token
  const refreshBody = {
    grant_type: "refresh_token",
    refresh_token: initialRefreshToken,
  } satisfies ICommunityBbsCommunityMember.IRefresh;

  const refreshed: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Assertions about refresh response tokens and session
  TestValidator.predicate(
    "refresh returned new access token",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh returned refresh token",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  typia.assert(refreshed.session);

  // 5. Verify that the refreshed session metadata is updated compared to initial session
  if (
    initialSession.expired_at === null ||
    initialSession.expired_at === undefined
  ) {
    // If initial session had no expiry, at least ensure refresh provided an expiry or same id
    TestValidator.predicate(
      "refresh session has id",
      typeof refreshed.session.id === "string" &&
        refreshed.session.id.length > 0,
    );
  } else {
    // When expired_at exists, ensure refreshed.expired_at is later than initial
    if (
      refreshed.session.expired_at === null ||
      refreshed.session.expired_at === undefined
    ) {
      // If refresh didn't return an expiry, at least ensure session id matches
      TestValidator.equals(
        "session id preserved on refresh",
        refreshed.session.id,
        initialSession.id,
      );
    } else {
      const oldExp = Date.parse(initialSession.expired_at);
      const newExp = Date.parse(refreshed.session.expired_at);
      TestValidator.predicate(
        "session expiry extended on refresh",
        newExp > oldExp,
      );
    }
  }

  // 6. Verify new access token authorizes protected endpoint by creating a second community
  const communityName2 = `test-community-2-${Date.now()}`;
  const communitySlug2 = communityName2
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");
  const communityBody2 = {
    name: communityName2,
    slug: communitySlug2,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const createdCommunity2: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityBody2 },
    );
  typia.assert(createdCommunity2);

  TestValidator.equals(
    "created community 2 slug matches request",
    createdCommunity2.slug,
    communitySlug2,
  );

  // End of test
}
