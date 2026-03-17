import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test basic member listing functionality with default pagination.
 *
 * This test validates the member discovery endpoint by:
 * 1. Creating an authenticated member account
 * 2. Calling the member listing endpoint with default parameters
 * 3. Verifying the paginated response structure
 * 4. Validating member summary fields through typia.assert()
 * 5. Confirming pagination metadata and sorting order
 *
 * @param connection Base connection for the test
 */
export async function test_api_member_list_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to access the member listing endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Call member listing endpoint with default pagination (no filters)
  const response = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "limit does not exceed 100",
    response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate response data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Verify at least the authenticated member appears in results
  const authenticatedMemberFound = response.data.some(
    (member) => member.id === authorizedMember.id,
  );
  TestValidator.predicate(
    "authenticated member appears in member list",
    authenticatedMemberFound,
  );
  // 6. Verify sorting by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentTime = new Date(response.data[i].created_at).getTime();
      const nextTime = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `members sorted by created_at descending (${i} >= ${i + 1})`,
        currentTime >= nextTime,
      );
    }
  }
  // 7. Validate page size consistency
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}