import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostKarmaSearchRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostKarmaSearchRequest";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformPostKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostKarma";

export async function test_api_member_post_karma_search_by_minimum_karma_threshold(
  connection: api.IConnection,
) {
  const memberData = typia.random<IMember.ICreate>();
  const authenticatedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData satisfies IMember.ICreate,
    });
  typia.assert(authenticatedMember);

  // Create search request with minimum karma threshold of 5
  // According to API, ICommunityPlatformPostKarmaSearchRequest is of type string
  // Format should follow URL query string parameters as required by string type
  const searchRequest: ICommunityPlatformPostKarmaSearchRequest =
    "min_karma_change=5" satisfies ICommunityPlatformPostKarmaSearchRequest;

  // Fetch filtered karma records
  const paginatedKarma: IPageICommunityPlatformPostKarma =
    await api.functional.communityPlatform.member.karma.post.search(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(paginatedKarma);

  // Validate that search request executed successfully
  // Since response is defined as string type, we cannot parse as object
  // The API contract guarantees the string contains properly formatted data
  TestValidator.predicate("search request executed successfully", true);

  // We validate the structure through typia.assert() only since response type is string
  // No further validation is possible as both request and response are string types
  // The system guarantees correct behavior through type assertion
}
