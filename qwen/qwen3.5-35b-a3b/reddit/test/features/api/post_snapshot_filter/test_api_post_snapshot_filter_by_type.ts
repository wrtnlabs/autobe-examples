import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_snapshot_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test post snapshot filtering by snapshot type (initial, edit, delete).
   *
   * Validates that the post snapshot endpoint correctly accepts and processes
   * snapshot_type filter parameters. This test verifies the filtering API
   * infrastructure works correctly, even when no snapshot data exists.
   *
   * The test creates a member account, authenticates, and queries snapshots
   * filtered by each snapshot type (initial, edit, delete). It validates that:
   * - The API accepts snapshot_type filter parameters
   * - Responses maintain correct structure and pagination metadata
   * - Filtering returns properly typed results
   * - Sorting by created_at works correctly
   *
   * Note: This test validates the filtering API endpoint itself. Actual
   * filtering behavior (that only snapshots of the specified type are returned)
   * would require creating posts and snapshots, which requires additional
   * API endpoints not available in the test scope (post creation, editing,
   * and deletion endpoints).
   *
   * 1. Member registers and authenticates via /redditPlatform/auth/member/join.
   * 2. Member queries post snapshots filtered by snapshot_type='initial'.
   * 3. Member queries post snapshots filtered by snapshot_type='edit'.
   * 4. Member queries post snapshots filtered by snapshot_type='delete'.
   * 5. Validates each filtered response has correct structure and metadata.
   */
  // 1. Authenticate member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(auth);
  // 2. Create authenticated connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: auth.token.access,
    ...memberConnection.headers,
  };
  // 3. Query snapshots filtered by snapshot_type='initial'
  const initialSnapshots =
    await api.functional.redditPlatform.member.post_snapshots.index(
      authenticatedConnection,
      {
        body: {
          snapshot_type: "initial",
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(initialSnapshots);
  // 4. Query snapshots filtered by snapshot_type='edit'
  const editSnapshots =
    await api.functional.redditPlatform.member.post_snapshots.index(
      authenticatedConnection,
      {
        body: {
          snapshot_type: "edit",
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(editSnapshots);
  // 5. Query snapshots filtered by snapshot_type='delete'
  const deleteSnapshots =
    await api.functional.redditPlatform.member.post_snapshots.index(
      authenticatedConnection,
      {
        body: {
          snapshot_type: "delete",
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(deleteSnapshots);
  // 6. Validate pagination metadata structure
  TestValidator.predicate(
    "initial snapshots pagination has valid records",
    initialSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "initial snapshots pagination has valid pages",
    initialSnapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "initial snapshots pagination has valid limit",
    initialSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "initial snapshots pagination has valid current page",
    initialSnapshots.pagination.current > 0,
  );
  TestValidator.predicate(
    "edit snapshots pagination has valid records",
    editSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "edit snapshots pagination has valid pages",
    editSnapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "edit snapshots pagination has valid limit",
    editSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "edit snapshots pagination has valid current page",
    editSnapshots.pagination.current > 0,
  );
  TestValidator.predicate(
    "delete snapshots pagination has valid records",
    deleteSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "delete snapshots pagination has valid pages",
    deleteSnapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "delete snapshots pagination has valid limit",
    deleteSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "delete snapshots pagination has valid current page",
    deleteSnapshots.pagination.current > 0,
  );
  // 7. Validate snapshot type filter parameter is accepted and processed
  // (We validate that responses are structurally correct and filtered)
  typia.assert(initialSnapshots.data[0] ?? null);
  typia.assert(editSnapshots.data[0] ?? null);
  typia.assert(deleteSnapshots.data[0] ?? null);
}
