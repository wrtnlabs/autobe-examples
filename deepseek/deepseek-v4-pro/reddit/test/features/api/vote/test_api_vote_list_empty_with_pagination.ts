import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test empty vote list pagination for a newly joined member with no voting history.
 *
 * Validates that querying the vote list endpoint for a member with zero votes returns a properly structured paginated response. The system must handle empty result sets gracefully, returning accurate pagination metadata alongside an empty data array.
 *
 * The test covers two pagination scenarios: default pagination where no parameters are provided and the limit defaults to 20, and explicit pagination with a custom page size of 5 and sorting by created_at in ascending order. Both scenarios must return consistent metadata reflecting the actual zero-record state, with all required pagination fields present.
 *
 * 1. A fresh member is registered via join with no prior voting activity.
 * 2. The member queries the vote list with an empty request body (no filters, no pagination).
 * 3. Validates the empty data array and default pagination metadata: records=0, pages=0, current=1, limit=20.
 * 4. The member queries the vote list again with explicit page=1, limit=5, and sort=created_at.
 * 5. Validates the response still returns empty data with the adjusted pagination metadata reflecting the custom limit.
 */
export async function test_api_vote_list_empty_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Register a fresh member with no voting history
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityHubMember.IJoin,
  });
  // Query vote list with empty body — no filters, default pagination
  const emptyResult = await api.functional.communityHub.member.votes.index(
    memberConnection,
    { body: {} satisfies ICommunityHubVote.IRequest },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("records zero", emptyResult.pagination.records, 0);
  TestValidator.equals("pages zero", emptyResult.pagination.pages, 0);
  TestValidator.equals("current page one", emptyResult.pagination.current, 1);
  TestValidator.equals(
    "default limit twenty",
    emptyResult.pagination.limit,
    20,
  );
  // Query with explicit pagination parameters and ascending sort
  const pagedResult = await api.functional.communityHub.member.votes.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
        sort: "created_at",
      } satisfies ICommunityHubVote.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals(
    "empty data with explicit pagination",
    pagedResult.data.length,
    0,
  );
  TestValidator.equals("records still zero", pagedResult.pagination.records, 0);
  TestValidator.equals("pages still zero", pagedResult.pagination.pages, 0);
  TestValidator.equals(
    "current page one explicit",
    pagedResult.pagination.current,
    1,
  );
  TestValidator.equals("custom limit five", pagedResult.pagination.limit, 5);
}
