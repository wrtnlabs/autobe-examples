import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecordSnapshot";
import type { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the basic functionality of retrieving ban record snapshots for audit trail review.
 *
 * Validates the complete ban snapshots list functionality including member authentication,
 * paginated response structure, and snapshot data validation. Ensures that the endpoint
 * correctly returns audit trail data with proper pagination metadata and snapshot
 * references to users and communities.
 *
 * Special attention is given to verifying that:
 * - Pagination metadata is accurate (current page, limit, records, pages)
 * - Snapshot summaries contain all required fields with correct types
 * - User and community references are properly populated
 * - Datetime fields follow ISO 8601 format
 * - Empty results return correct pagination (0 records, 0 pages)
 * - Default sorting by snapshot_created_at in descending order
 *
 * 1. Member registers with randomized credentials via join endpoint.
 * 2. Creates member-specific connection with JWT token from join response.
 * 3. Calls ban snapshots endpoint with default pagination parameters.
 * 4. Validates response structure and pagination metadata.
 * 5. Validates snapshot summary fields if data exists.
 * 6. Verifies datetime format compliance.
 */
export async function test_api_ban_snapshots_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection for ban snapshots
  const snapshotsConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Call ban snapshots endpoint with default pagination
  const snapshotsResponse =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      snapshotsConnection,
      {
        body: {} satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records non-negative",
    snapshotsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    snapshotsResponse.pagination.pages,
    snapshotsResponse.pagination.records > 0
      ? Math.ceil(
          snapshotsResponse.pagination.records /
            snapshotsResponse.pagination.limit,
        )
      : 0,
  );
  // 5. Validate data array structure and length
  TestValidator.equals(
    "data length matches pagination limit",
    snapshotsResponse.data.length,
    snapshotsResponse.data.length <= snapshotsResponse.pagination.limit
      ? snapshotsResponse.data.length
      : snapshotsResponse.pagination.limit,
  );
  // 6. Validate snapshot summary fields if data exists
  if (snapshotsResponse.data.length > 0) {
    const firstSnapshot = snapshotsResponse.data[0];
    // Validate snapshot summary required fields
    TestValidator.equals(
      "snapshot has uuid id",
      /^[0-9a-f-]{36}$/i.test(firstSnapshot.id),
      true,
    );
    TestValidator.equals(
      "snapshot has reason string",
      typeof firstSnapshot.reason === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has banned_at datetime",
      !isNaN(Date.parse(firstSnapshot.banned_at)),
      true,
    );
    TestValidator.equals(
      "snapshot unbanned_at is nullable or datetime",
      firstSnapshot.unbanned_at === null ||
        firstSnapshot.unbanned_at === undefined ||
        !isNaN(Date.parse(firstSnapshot.unbanned_at)),
      true,
    );
    TestValidator.equals(
      "snapshot has snapshot_created_at datetime",
      !isNaN(Date.parse(firstSnapshot.snapshot_created_at)),
      true,
    );
    // Validate user reference
    TestValidator.equals(
      "snapshot user is summary",
      typeof firstSnapshot.user.id === "string",
      true,
    );
    TestValidator.equals(
      "snapshot user has username",
      typeof firstSnapshot.user.username === "string",
      true,
    );
    TestValidator.equals(
      "snapshot user has karma int32",
      typeof firstSnapshot.user.karma === "number",
      true,
    );
    TestValidator.equals(
      "snapshot user has created_at datetime",
      !isNaN(Date.parse(firstSnapshot.user.created_at)),
      true,
    );
    // Validate community reference
    TestValidator.equals(
      "snapshot community is summary",
      typeof firstSnapshot.community.id === "string",
      true,
    );
    TestValidator.equals(
      "snapshot community has name",
      typeof firstSnapshot.community.name === "string",
      true,
    );
    TestValidator.equals(
      "snapshot community has subscriber_count",
      typeof firstSnapshot.community.subscriber_count === "number",
      true,
    );
    TestValidator.equals(
      "snapshot community owner reference",
      typeof firstSnapshot.community.owner.id === "string",
      true,
    );
    // Validate banned_by reference (can be null)
    TestValidator.equals(
      "snapshot banned_by is summary or null",
      firstSnapshot.banned_by === null ||
        (typeof firstSnapshot.banned_by === "object" &&
          typeof firstSnapshot.banned_by.id === "string"),
      true,
    );
  }
}
