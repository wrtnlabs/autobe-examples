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
 * Test that searching vote summaries with an unmatched filter returns an empty page, not an error.
 *
 * Validates that the PATCH /member/vote-summaries endpoint correctly handles the case where no records match the filter criteria. When a filter threshold (min_upvote_count) is set impossibly high (999999), the API must return HTTP 200 with empty pagination metadata rather than throwing a 404 or other error.
 *
 * Uses the member-scoped authorization flow via `authorize_member_join` utility to authenticate the test member.
 *
 * 1. Join as a new member to obtain authenticated session context.
 * 2. Call vote-summaries with min_upvote_count=999999 (impossibly high threshold).
 * 3. Validate that the response is a valid page with records=0, pages=0, and an empty data array.
 */
export async function test_api_vote_summary_empty_results_with_unmatched_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call vote-summaries with an impossibly high min_upvote_count that matches no records
  const page =
    await api.functional.communityPlatform.member.vote_summaries.index(
      memberConnection,
      {
        body: {
          min_upvote_count: 999999 as number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
        } satisfies ICommunityPlatformVoteSummary.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate empty results
  TestValidator.equals("pagination records count", page.pagination.records, 0);
  TestValidator.equals("pagination pages count", page.pagination.pages, 0);
  TestValidator.equals("empty data array length", page.data.length, 0);
}
