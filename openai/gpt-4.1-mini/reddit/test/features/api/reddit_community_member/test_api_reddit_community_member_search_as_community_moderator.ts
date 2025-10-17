import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_reddit_community_member_search_as_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register new communityModerator user
  const joinBody = {
    email: RandomGenerator.pick([
      "alpha@example.com",
      "beta@example.org",
      "gamma@example.net",
      "delta@example.io",
    ] as const),
    password: "P4s$w0rd!",
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: joinBody },
    );
  typia.assert(moderator);

  // 2. Prepare typical search request with email pattern and creation date range
  const now = new Date();
  const createdFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const createdTo = now;

  const searchBody = {
    page: 1,
    limit: 20,
    email: "@example",
    is_email_verified: true,
    created_at_from: createdFrom.toISOString(),
    created_at_to: createdTo.toISOString(),
  } satisfies IRedditCommunityMember.IRequest;

  // 3. Execute search
  const page: IPageIRedditCommunityMember.ISummary =
    await api.functional.redditCommunity.communityModerator.redditCommunityMembers.index(
      connection,
      { body: searchBody },
    );
  typia.assert(page);

  // 4. Validate pagination info
  TestValidator.predicate(
    "current page positive",
    page.pagination.current >= 1,
  );
  TestValidator.predicate("limit positive", page.pagination.limit >= 1);
  TestValidator.predicate("records >= 0", page.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", page.pagination.pages >= 0);
  TestValidator.equals(
    "pages correct",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );

  // 5. Validate members data
  for (const member of page.data) {
    typia.assert(member);
    TestValidator.predicate(
      "member email includes '@'",
      member.email.includes("@"),
    );
    TestValidator.equals(
      "member is_email_verified",
      member.is_email_verified,
      true,
    );
    TestValidator.predicate(
      "member id is uuid string",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );
    TestValidator.predicate(
      "member created_at is ISO date",
      !isNaN(Date.parse(member.created_at)),
    );
    TestValidator.predicate(
      "member updated_at is ISO date",
      !isNaN(Date.parse(member.updated_at)),
    );
    if (member.deleted_at !== null && member.deleted_at !== undefined) {
      TestValidator.predicate(
        "member deleted_at is ISO date",
        !isNaN(Date.parse(member.deleted_at)),
      );
    }
  }
}
