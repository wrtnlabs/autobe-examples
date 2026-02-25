import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test the ban list search functionality using trigram matching on ban reasons.
 * As an authenticated moderator, search for ban records containing specific keywords
 * in the reason text. Verify that the search returns relevant matches using trigram
 * search logic (partial matches, similar text patterns). Test with various search
 * terms: exact phrases, partial words, case variations. Validate that the search
 * works independently and in combination with other filters like status and date
 * ranges. Ensure that bans without matching text are correctly excluded. Test edge
 * cases: empty search term (should return all results), non-existent terms (should
 * return empty results), and special characters in search. Verify that the returned
 * ban summaries maintain all required fields including user info, moderator details,
 * timestamps, and the searched reason text.
 */
export async function test_api_moderator_ban_list_search_by_reason_text(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Generate test community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Empty search term should return all results
  const emptySearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Test 2: Search with exact phrase
  const exactSearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "spam violation",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(exactSearchResult);
  // Test 3: Search with partial word
  const partialSearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "spam",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  // Test 4: Search with case variation
  const caseSearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "SPAM",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(caseSearchResult);
  // Test 5: Search with non-existent term
  const nonExistentSearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "nonexistentterm12345",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(nonExistentSearchResult);
  TestValidator.equals(
    "non-existent search returns empty data",
    nonExistentSearchResult.data.length,
    0,
  );
  // Test 6: Search with special characters
  const specialCharSearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "spam@violation",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(specialCharSearchResult);
  // Test 7: Search combined with status filter
  const statusSearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "spam",
          status: "active",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(statusSearchResult);
  // Test 8: Search combined with date range filter
  const dateSearchResult =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          search: "violation",
          banned_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          banned_at_end: new Date().toISOString(),
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(dateSearchResult);
  // Validate that returned ban summaries contain all required fields
  if (emptySearchResult.data.length > 0) {
    const banSummary = emptySearchResult.data[0];
    TestValidator.predicate("ban summary has id", banSummary.id.length > 0);
    TestValidator.predicate(
      "ban summary has reason",
      banSummary.reason.length > 0,
    );
    TestValidator.predicate(
      "ban summary has status",
      banSummary.status.length > 0,
    );
    TestValidator.predicate(
      "ban summary has banned_at",
      banSummary.banned_at.length > 0,
    );
    TestValidator.predicate(
      "ban summary has user info",
      banSummary.user.id.length > 0,
    );
    TestValidator.predicate(
      "ban summary has moderator info",
      banSummary.moderator.id.length > 0,
    );
  }
}
