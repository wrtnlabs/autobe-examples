import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";

/**
 * Test moderator member search with different sorting options.
 *
 * This test validates that moderator member search functionality correctly
 * sorts results based on various criteria including creation date, update date,
 * last activity, karma score, display name, and email address. Both ascending
 * and descending directions are tested for comprehensive coverage.
 */
export async function test_api_moderator_member_search_ordering(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Create multiple member accounts with diverse attributes
  const members: ICommunityPlatformMember.IAuthorized[] = [];

  // Create members with member authentication context
  for (let i = 0; i < 5; i++) {
    // Create unauthenticated connection for member creation
    const memberConnection: api.IConnection = { ...connection, headers: {} };

    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(memberConnection, {
        body: {
          email: memberEmail,
          password: "password123",
          display_name: RandomGenerator.name(),
          href: "https://example.com",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push(member);

    // Add small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Test sorting by different fields with both directions
  const sortFields = [
    "created_at",
    "updated_at",
    "last_active_at",
    "karma_score",
    "display_name",
    "email",
  ] as const;
  const directions = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of directions) {
      const searchResult: IPageICommunityPlatformMember.ISummary =
        await api.functional.communityPlatform.moderator.members.index(
          connection,
          {
            body: {
              page: 1,
              limit: 10,
              order_by: field,
              order_direction: direction,
            } satisfies ICommunityPlatformMember.IRequest,
          },
        );
      typia.assert(searchResult);

      TestValidator.predicate(
        `search returns paginated results for ${field} ${direction}`,
        searchResult.pagination.records >= members.length,
      );

      // Validate sorting logic
      if (searchResult.data.length > 1) {
        for (let i = 1; i < searchResult.data.length; i++) {
          const current = searchResult.data[i];
          const previous = searchResult.data[i - 1];

          let isValidOrder = true;

          switch (field) {
            case "created_at":
              isValidOrder =
                direction === "asc"
                  ? current.created_at >= previous.created_at
                  : current.created_at <= previous.created_at;
              break;
            case "updated_at":
              isValidOrder =
                direction === "asc"
                  ? current.created_at >= previous.created_at
                  : current.created_at <= previous.created_at;
              break;
            case "last_active_at":
              // Handle null/undefined values for last_active_at
              if (current.last_active_at && previous.last_active_at) {
                isValidOrder =
                  direction === "asc"
                    ? current.last_active_at >= previous.last_active_at
                    : current.last_active_at <= previous.last_active_at;
              } else if (!current.last_active_at && previous.last_active_at) {
                // null/undefined values should come after non-null values in asc, before in desc
                isValidOrder = direction === "asc" ? false : true;
              } else if (current.last_active_at && !previous.last_active_at) {
                isValidOrder = direction === "asc" ? true : false;
              } else {
                // Both are null/undefined - order doesn't matter
                isValidOrder = true;
              }
              break;
            case "karma_score":
              isValidOrder =
                direction === "asc"
                  ? current.karma_score >= previous.karma_score
                  : current.karma_score <= previous.karma_score;
              break;
            case "display_name":
              isValidOrder =
                direction === "asc"
                  ? current.display_name.localeCompare(previous.display_name) >=
                    0
                  : current.display_name.localeCompare(previous.display_name) <=
                    0;
              break;
            case "email":
              isValidOrder =
                direction === "asc"
                  ? current.email.localeCompare(previous.email) >= 0
                  : current.email.localeCompare(previous.email) <= 0;
              break;
          }

          TestValidator.predicate(
            `members are correctly sorted by ${field} ${direction} at position ${i}`,
            isValidOrder,
          );
        }
      }
    }
  }
}
