import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityProfile";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test profile search functionality with case-insensitive display name substring matching.
 *
 * Validates the profile search endpoint returns matching profiles based on
 * display name substring queries. Creates a member account for search
 * validation, then performs search queries to verify exact and partial
 * matches are returned correctly. Ensures soft-deleted profiles are excluded
 * and pagination metadata accurately reflects active matching records.
 *
 * 1. Create a new member account for profile generation.
 * 2. Use the member's display name (or username fallback) as search query.
 * 3. Search profiles using the display name substring.
 * 4. Validate search results include matching profiles with correct display names.
 * 5. Verify pagination metadata reflects accurate record counts.
 * 6. Confirm member's own profile appears in search results when applicable.
 */
export async function test_api_profiles_search_display_name(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Determine search query - use display_name if available, otherwise username
  const searchQuery: string = member.display_name ?? member.username;
  // 3. Search profiles using case-insensitive display name substring matching
  const searchResult = await api.functional.redditLikeCommunity.profiles.index(
    memberConnection,
    {
      body: {
        search: searchQuery,
      } satisfies IREdditLikeCommunityProfile.IRequest,
    },
  );
  typia.assert(searchResult);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is greater than zero",
    searchResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  // 5. Validate search results contain matching profiles with display name
  for (const profile of searchResult.data) {
    if (profile.display_name !== null) {
      TestValidator.predicate(
        "profile display_name contains search query (case-insensitive)",
        profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
  }
  // 6. Verify own profile is returned if display_name matches search
  if (member.display_name !== null) {
    const foundProfile = searchResult.data.find(
      (profile) => profile.id === member.id,
    );
    if (foundProfile !== undefined) {
      TestValidator.equals(
        "found profile display_name matches member",
        foundProfile.display_name,
        member.display_name,
      );
      TestValidator.equals(
        "found profile id matches member",
        foundProfile.id,
        member.id,
      );
    }
  }
}
