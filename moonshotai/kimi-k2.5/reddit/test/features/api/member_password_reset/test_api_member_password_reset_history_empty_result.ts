import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberPasswordReset";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member with no password reset history receives an empty results array
 * with proper pagination metadata showing zero records. When a newly registered member queries their
 * password reset history without having requested any password resets, the system should return a
 * successful response with an empty data array. The pagination object should show current page, limit,
 * zero records, and zero pages. This tests the edge case of accessing the endpoint before any
 * password reset activities have occurred, ensuring the API handles empty result sets gracefully.
 *
 * @param connection Base connection to the API server
 */
export async function test_api_member_password_reset_history_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member connection and register (member has no password reset history yet)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Query password reset history for the member (before any reset requests)
  const query: IRedditLikeMemberPasswordReset.IRequest = {}; // Default pagination
  const response: IPageIRedditLikeMemberPasswordReset.ISummary =
    await api.functional.redditLike.member.password_resets.index(
      memberConnection,
      {
        body: query,
      },
    );
  typia.assert(response);
  // 3. Validate empty result set with correct pagination metadata
  TestValidator.equals("data should be empty array", response.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination current should be valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    response.pagination.limit >= 0,
  );
}
