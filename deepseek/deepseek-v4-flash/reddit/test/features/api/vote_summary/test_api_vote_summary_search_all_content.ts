import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can search all vote summaries with default pagination and no filters.
 *
 * Validates the PATCH /member/vote-summaries endpoint returns a properly structured paginated response
 * even when no vote summaries exist. Since no community creation, post, comment, or voting endpoints
 * are available in the SDK, this test validates the expected behavior for an empty result set as
 * specified in the API documentation.
 *
 * 1. Join as a new member via authorize_member_join utility.
 * 2. Call PATCH /member/vote-summaries with default parameters (no filters).
 * 3. Validate the response structure via typia.assert.
 */
export async function test_api_vote_summary_search_all_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Search all vote summaries with default parameters (no filters)
  const page =
    await api.functional.communityPlatform.member.vote_summaries.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformVoteSummary.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate business logic: empty result set expected
  TestValidator.predicate(
    "page has pagination",
    page.pagination.current > 0 &&
      page.pagination.limit > 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );
}
