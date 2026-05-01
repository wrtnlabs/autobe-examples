import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a non-existent vote returns a 404 Not Found error.
 *
 * Validates the business rule that querying a vote by an ID that does not exist
 * in the database is properly rejected with a clear error response rather than
 * returning an empty body or null. This ensures the API correctly distinguishes
 * between existing and non-existent vote records and provides appropriate error
 * feedback to the client.
 *
 * 1. A member authenticates via join to obtain JWT credentials.
 * 2. A random UUID is generated that does not correspond to any vote record.
 * 3. The member attempts to retrieve the non-existent vote.
 * 4. Validates that the API returns a 404 Not Found error.
 */
export async function test_api_vote_retrieve_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to retrieve a non-existent vote with random UUID
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 404 Not Found
  await TestValidator.httpError(
    "non-existent vote returns 404",
    404,
    async () => {
      await api.functional.communityHub.member.votes.at(memberConnection, {
        voteId: nonExistentVoteId,
      });
    },
  );
}
