import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verifications_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Record current time for date comparisons
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const oneDayFromNow = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  // Test 1: Basic search with no filters
  const basicSearch =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {} satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic search returns pagination",
    basicSearch.pagination !== undefined,
  );
  // Test 2: Search with consumed=true
  const consumedSearch =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          consumed: true,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(consumedSearch);
  if (consumedSearch.data.length > 0) {
    for (const token of consumedSearch.data) {
      TestValidator.predicate(
        "consumed token has consumed_at",
        token.consumed_at !== null && token.consumed_at !== undefined,
      );
    }
  }
  // Test 3: Search with created_after filter
  const createdAfterSearch =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          created_after: oneHourAgo,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(createdAfterSearch);
  if (createdAfterSearch.data.length > 0) {
    for (const token of createdAfterSearch.data) {
      TestValidator.predicate(
        "token created after specified date",
        token.created_at >= oneHourAgo,
      );
    }
  }
  // Test 4: Search with limit=1
  const limitedSearch =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: { limit: 1 } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(limitedSearch);
  TestValidator.predicate(
    "limit=1 returns at most 1 item",
    limitedSearch.data.length <= 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    limitedSearch.pagination.limit,
    1,
  );
  // Test 5: Validate computed status field logic
  const statusSearch =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {} satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(statusSearch);
  if (statusSearch.data.length > 0) {
    for (const token of statusSearch.data) {
      if (token.verified_at !== null && token.verified_at !== undefined) {
        TestValidator.equals(
          "verified token has status verified",
          token.status,
          "verified",
        );
      } else if (new Date(token.expires_at) < now) {
        TestValidator.equals(
          "expired token has status expired",
          token.status,
          "expired",
        );
      } else {
        TestValidator.equals(
          "active token has status active",
          token.status,
          "active",
        );
      }
    }
  }
  // Test 6: Validate soft-deleted records excluded (implicitly tested through all searches)
  // The API should automatically exclude records with deleted_at not null
  // We verify this by checking no returned tokens have deleted_at set
  const allTokens =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {} satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(allTokens);
  for (const token of allTokens.data) {
    TestValidator.predicate(
      "no soft-deleted tokens returned",
      token.deleted_at === null || token.deleted_at === undefined,
    );
  }
  // Test 7: Search with non-existent todo_app_member_id
  const nonExistentMemberIdSearch =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          todo_app_member_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(nonExistentMemberIdSearch);
  TestValidator.predicate(
    "search with non-existent member id returns empty",
    nonExistentMemberIdSearch.data.length === 0,
  );
  TestValidator.equals(
    "empty result pagination records is 0",
    nonExistentMemberIdSearch.pagination.records,
    0,
  );
  // Test 8: Test empty result set pagination metadata
  // We already tested this with non-existent member id search
  TestValidator.predicate(
    "empty result set has valid pagination",
    nonExistentMemberIdSearch.pagination.pages === 0 &&
      nonExistentMemberIdSearch.pagination.records === 0 &&
      nonExistentMemberIdSearch.pagination.current === 0,
  );
}
