import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test moderator listing endpoint as an unauthenticated public operation.
 *
 * Validates that the moderator list endpoint is accessible without authentication and returns a paginated list of moderator assignments with enriched member and community details. Each moderator summary should include the moderator's authority type (OWNER or MODERATOR), linked member identity (id, username, email), associated community information (id, name, description), and assignment timestamps.
 *
 * Verifies pagination metadata is correctly computed with current page, limit per page, total records across all pages, and total page count. Tests that the response structure properly includes both the data array containing moderator summaries and the pagination object.
 *
 * 1. Access the moderator list endpoint without any authentication.
 * 2. Submit a request with default pagination to retrieve first page.
 * 3. Validate response type and pagination metadata structure.
 * 4. When moderator data exists, verify each summary includes member details, community details, authority type, and timestamps.
 */
export async function test_api_moderator_list_public_access_with_member_and_community_details(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection without any authentication headers
  const guestConnection: api.IConnection = { host: connection.host };
  // Build request body with pagination parameters - all filters are optional
  const body: IRedditLikeCommunityModerator.IRequest = {
    page: 1,
    limit: 20,
  } satisfies IRedditLikeCommunityModerator.IRequest;
  // Fetch moderator list as unauthenticated guest
  const response = await api.functional.redditLikeCommunity.moderators.index(
    guestConnection,
    {
      body: body,
    },
  );
  // Validate complete response type structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate structure of moderator summaries when data exists
  if (response.data.length > 0) {
    const moderator = response.data[0]!;
    // Validate authority type is a valid value
    TestValidator.predicate(
      "authority type is valid",
      moderator.authority_type === "OWNER" ||
        moderator.authority_type === "MODERATOR",
    );
    // Validate member details are present with expected fields
    TestValidator.predicate("member has id", moderator.member.id !== "");
    TestValidator.predicate(
      "member has username",
      moderator.member.username !== "",
    );
    TestValidator.predicate("member has email", moderator.member.email !== "");
    TestValidator.predicate(
      "member has created_at",
      moderator.member.created_at !== "",
    );
    // Validate community details are present with expected fields
    TestValidator.predicate("community has id", moderator.community.id !== "");
    TestValidator.predicate(
      "community has name",
      moderator.community.name !== "",
    );
    TestValidator.predicate(
      "community has description",
      moderator.community.description !== "",
    );
    TestValidator.predicate(
      "community has created_at",
      moderator.community.created_at !== "",
    );
    // Validate moderator timestamps
    TestValidator.predicate(
      "moderator has created_at",
      moderator.created_at !== "",
    );
    TestValidator.predicate(
      "moderator has updated_at",
      moderator.updated_at !== "",
    );
    // Validate creator relationship in community
    TestValidator.predicate(
      "community creator has id",
      moderator.community.creator.id !== "",
    );
  }
}
