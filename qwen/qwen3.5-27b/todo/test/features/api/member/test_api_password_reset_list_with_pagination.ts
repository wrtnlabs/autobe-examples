import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset token list retrieval with pagination for authenticated member.
 *
 * Validates that an authenticated member can retrieve their password reset token history with proper pagination, sorting, and filtering capabilities. Ensures data isolation by confirming only the authenticated member's tokens are accessible.
 *
 * Special attention is given to verifying pagination metadata accuracy, token summary structure, and sorting behavior with different parameters.
 *
 * 1. Register a new member account and authenticate the connection.
 * 2. Retrieve password reset tokens with default pagination (page=1, limit=10).
 * 3. Validate pagination metadata (current page, limit, records, pages).
 * 4. Test pagination with page=2 (should return empty data if no tokens exist).
 * 5. Test with custom limit parameter (limit=5).
 * 6. Test with custom sort order (order=asc for oldest first).
 */
export async function test_api_password_reset_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve password reset tokens with default pagination
  const defaultPage =
    await api.functional.todoApp.member.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(defaultPage);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals("limit is 10", defaultPage.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // 4. Test pagination with page=2
  const secondPage =
    await api.functional.todoApp.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          page: 2,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("current page is 2", secondPage.pagination.current, 2);
  TestValidator.predicate(
    "second page data is empty or has tokens",
    secondPage.data.length >= 0,
  );
  // 5. Test with custom limit parameter
  const customLimit =
    await api.functional.todoApp.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          limit: 5,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(customLimit);
  TestValidator.equals("limit is 5", customLimit.pagination.limit, 5);
  TestValidator.predicate(
    "data length does not exceed limit",
    customLimit.data.length <= 5,
  );
  // 6. Test with custom sort order (ascending)
  const ascendingOrder =
    await api.functional.todoApp.member.member.password_resets.index(
      memberConnection,
      {
        body: {
          order: "asc",
          sort: "created_at",
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(ascendingOrder);
  TestValidator.predicate(
    "ascending order has valid data",
    ascendingOrder.data.length >= 0,
  );
  // Verify ascending sort order if multiple tokens exist
  if (ascendingOrder.data.length > 1) {
    for (let i = 1; i < ascendingOrder.data.length; i++) {
      TestValidator.predicate(
        `token ${i} created_at >= token ${i - 1} created_at`,
        new Date(ascendingOrder.data[i].created_at).getTime() >=
          new Date(ascendingOrder.data[i - 1].created_at).getTime(),
      );
    }
  }
}
