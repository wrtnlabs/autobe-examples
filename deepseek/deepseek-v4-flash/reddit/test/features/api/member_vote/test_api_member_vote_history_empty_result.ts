import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a newly registered member with no voting activity receives an empty paginated result set when viewing their vote history.
 *
 * Validates the empty-state behavior of the member vote history endpoint. A freshly registered member who has not cast any votes should receive a valid paginated response with zero records and an empty data array.
 *
 * 1. Register a new member account using randomized credentials.
 * 2. Query the member's vote history with no filters applied.
 * 3. Validate the response structure and verify pagination metadata is present.
 * 4. Verify pagination.records is 0 and data array is empty.
 */
export async function test_api_member_vote_history_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Query vote history with no filters (empty request body)
  const voteHistory: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.votes.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(voteHistory);
  // 3. Validate empty result set
  TestValidator.equals("no vote records", voteHistory.pagination.records, 0);
  TestValidator.equals("data array is empty", voteHistory.data.length, 0);
}
