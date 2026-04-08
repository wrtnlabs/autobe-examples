import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberEmailVerification";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification list endpoint returns empty results for non-matching filters.
 *
 * Validates that the email verification list endpoint gracefully handles empty result sets
 * when filter criteria don't match any records. Tests three scenarios: non-existent member ID,
 * status-based filters with conflicting date ranges, and non-matching token patterns.
 *
 * Ensures that empty results return proper pagination metadata (records=0, pages=0) with
 * an empty data array, and that the endpoint returns 200 OK status without errors.
 * This confirms the endpoint handles invalid filters gracefully without exposing sensitive data.
 *
 * 1. Create member account and authenticate.
 * 2. Test 1: Query with non-existent member UUID filter.
 * 3. Test 2: Query with expired status + future created_at_start filter.
 * 4. Test 3: Query with non-matching token pattern.
 * 5. Validate all responses have empty data and correct pagination metadata.
 */
export async function test_api_email_verification_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies DeepPartial<IRedditCommunityMember.IJoin>,
    });
  typia.assert(member);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 2. Test 1: Non-existent member filter
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const response1: IPageIRedditCommunityMemberEmailVerification.ISummary =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: nonExistentId,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals("empty data array - test 1", response1.data.length, 0);
  TestValidator.equals("records=0 - test 1", response1.pagination.records, 0);
  TestValidator.equals("pages=0 - test 1", response1.pagination.pages, 0);
  // 3. Test 2: Combined filters with no matches (expired status + future date)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 365 * 10); // 10 years in future
  const response2: IPageIRedditCommunityMemberEmailVerification.ISummary =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "expired",
          created_at_start: futureDate.toISOString(),
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("empty data array - test 2", response2.data.length, 0);
  TestValidator.equals("records=0 - test 2", response2.pagination.records, 0);
  TestValidator.equals("pages=0 - test 2", response2.pagination.pages, 0);
  // 4. Test 3: Non-matching token pattern
  const nonMatchingToken =
    "this-is-a-random-token-pattern-that-does-not-exist-" +
    RandomGenerator.alphaNumeric(20);
  const response3: IPageIRedditCommunityMemberEmailVerification.ISummary =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          token: nonMatchingToken,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("empty data array - test 3", response3.data.length, 0);
  TestValidator.equals("records=0 - test 3", response3.pagination.records, 0);
  TestValidator.equals("pages=0 - test 3", response3.pagination.pages, 0);
}
