import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community deletion with soft delete validation.
 *
 * This test validates the deletion mechanics of a community, focusing on the
 * soft delete pattern implementation. It verifies that when a moderator deletes
 * a community, the operation properly sets the deleted_at timestamp while
 * preserving all historical data.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a community with full configuration including name, title,
 *    description, rules
 * 3. Execute the deletion operation using the community name as identifier
 * 4. Verify the deletion succeeds and returns the community's final state
 * 5. Validate that deleted_at timestamp is properly set to a valid ISO 8601
 *    date-time
 * 6. Confirm all community data is preserved in the response (soft delete pattern)
 *
 * Business validations:
 *
 * - Soft delete mechanism preserves community records for audit and compliance
 * - Deleted communities maintain referential integrity for historical analysis
 * - Deletion timestamp enables filtering deleted communities from public access
 */
export async function test_api_community_deletion_with_active_content(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community with complete configuration
  const communityName = RandomGenerator.alphaNumeric(15).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 7,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Perform the deletion operation
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityname(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(deletedCommunity);

  // Step 4: Verify the deletion succeeded and returned the community's final state
  TestValidator.equals(
    "deleted community ID matches",
    deletedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "deleted community name matches",
    deletedCommunity.name,
    community.name,
  );

  // Step 5: Confirm deleted_at timestamp is properly set
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 6: Validate the soft delete mechanism preserves the community record
  TestValidator.predicate(
    "soft delete preserves all community data",
    deletedCommunity.display_title === community.display_title &&
      deletedCommunity.description === community.description &&
      deletedCommunity.creator_member_id === community.creator_member_id,
  );
}
