import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfile";

/**
 * Validates moderator's profile search with authentication and privacy
 * restrictions.
 *
 * 1. Create/join as a new moderator
 * 2. Perform profile search with various filters as moderator:
 *
 *    - Search by existing username
 *    - Search with non-existent filter (should result in empty list)
 *    - Search for restricted/private profiles (should return redacted or limited
 *         fields)
 * 3. Validate pagination
 * 4. Confirm access permissions and privacy enforcement: moderator cannot see all
 *    private profile fields
 */
export async function test_api_profile_search_by_moderator_with_authentication_and_privacy_restrictions(
  connection: api.IConnection,
) {
  // 1. Register (authenticate) as moderator
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    email: moderatorEmail,
    password: "securePassword123!",
    community_id: communityId,
  } satisfies ICommunityPlatformModerator.IJoin;

  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinBody });
  typia.assert(moderatorAuth);

  // 2. Search profiles with various filters
  // a) Search by exact username (simulate one to exist)
  const searchByUsernameReq = {
    username: RandomGenerator.alphabets(8),
    limit: 5,
    page: 1,
    sortBy: "username",
    sortOrder: "asc",
  } satisfies ICommunityPlatformProfile.IRequest;
  const usernameResult: IPageICommunityPlatformProfile =
    await api.functional.communityPlatform.moderator.profiles.index(
      connection,
      { body: searchByUsernameReq },
    );
  typia.assert(usernameResult);
  TestValidator.predicate(
    "username search returns array",
    Array.isArray(usernameResult.data),
  );

  // b) Search with filters that intentionally match none (should return empty)
  const noMatchReq = {
    username: "nonexistentusernameusersearch",
    page: 1,
    limit: 2,
  } satisfies ICommunityPlatformProfile.IRequest;
  const noMatchResult: IPageICommunityPlatformProfile =
    await api.functional.communityPlatform.moderator.profiles.index(
      connection,
      { body: noMatchReq },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no matches results in empty data",
    noMatchResult.data.length,
    0,
  );

  // c) Search for both public and private profiles, validate privacy enforcement
  const publicPrivateReq = {
    isPublic: undefined,
    limit: 10,
    page: 1,
  } satisfies ICommunityPlatformProfile.IRequest;
  const pubPrivPage: IPageICommunityPlatformProfile =
    await api.functional.communityPlatform.moderator.profiles.index(
      connection,
      { body: publicPrivateReq },
    );
  typia.assert(pubPrivPage);
  TestValidator.predicate(
    "profile page contains data array",
    Array.isArray(pubPrivPage.data),
  );
  // Validate that private profiles are returned but have restricted fields
  for (const profile of pubPrivPage.data) {
    typia.assert(profile);
    if (!profile.is_public) {
      // Should NOT see display_email, avatar_uri, or bio unless public
      TestValidator.equals(
        "private email is hidden or null/undefined",
        profile.display_email ?? null,
        null,
      );
      TestValidator.equals(
        "private avatar is hidden or null/undefined",
        profile.avatar_uri ?? null,
        null,
      );
      TestValidator.equals(
        "private bio is hidden or null/undefined",
        profile.bio ?? null,
        null,
      );
    }
  }

  // d) Pagination: request two subsequent pages with small limit and check that data changes
  const page1Req = {
    limit: 2,
    page: 1,
    sortBy: "created_at",
    sortOrder: "asc",
  } satisfies ICommunityPlatformProfile.IRequest;
  const page2Req = {
    limit: 2,
    page: 2,
    sortBy: "created_at",
    sortOrder: "asc",
  } satisfies ICommunityPlatformProfile.IRequest;
  const page1: IPageICommunityPlatformProfile =
    await api.functional.communityPlatform.moderator.profiles.index(
      connection,
      { body: page1Req },
    );
  const page2: IPageICommunityPlatformProfile =
    await api.functional.communityPlatform.moderator.profiles.index(
      connection,
      { body: page2Req },
    );
  typia.assert(page1);
  typia.assert(page2);
  TestValidator.notEquals(
    "pagination works: pages 1 and 2 are different",
    page1.data,
    page2.data,
  );
}
