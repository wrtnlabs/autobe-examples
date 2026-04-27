import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
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
 * Test retrieving a vote record that does not exist returns 404 Not Found.
 *
 * Validates that the vote retrieval endpoint properly handles requests for non-existent vote records. When a valid, authenticated request is made with a UUID that does not correspond to any existing vote in the database, the system must return a 404 Not Found response instead of crashing or returning a 5xx server error.
 *
 * This scenario tests the business logic specified in the endpoint: 'If no record is found, return a 404 Not Found response.' It distinguishes the 'resource does not exist' case from the 'resource exists but you cannot access it' case.
 *
 * 1. Join as a new member via `authorize_member_join` to obtain JWT authentication tokens.
 * 2. Call `GET /member/votes/{voteId}` with a valid UUID v4 string that does not correspond to any existing vote record.
 * 3. Expect an HTTP 404 Not Found error response.
 */
export async function test_api_vote_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to retrieve a non-existent vote record
  await TestValidator.httpError("vote not found", 404, async () => {
    await api.functional.communityPlatform.member.votes.at(memberConnection, {
      voteId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
