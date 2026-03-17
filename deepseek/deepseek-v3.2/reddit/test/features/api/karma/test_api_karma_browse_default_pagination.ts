import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the default paginated retrieval of karma scores without any filters.
 * Verify that the endpoint returns a paginated list of karma records with
 * the expected structure including pagination metadata.
 * Validate that each karma record contains the required fields: id, score,
 * member information (id, email, username, etc.), created_at, and updated_at.
 * Check that the pagination metadata includes current page, limit, total records,
 * and total pages. Ensure the response follows the expected schema and returns
 * valid data even when no filters are applied.
 */
export async function test_api_karma_browse_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection with authorization
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      anonymous_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Call karma browse endpoint with default parameters (empty request)
  const response = await api.functional.communityPlatform.guest.karmas.index(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination metadata present",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    "current" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has limit",
    "limit" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has total records",
    "records" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has total pages",
    "pages" in response.pagination,
  );
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  // Validate each karma record
  for (const karma of response.data) {
    // Check required fields
    TestValidator.predicate(
      "karma has id",
      typeof karma.id === "string" && /^[0-9a-f-]{36}$/i.test(karma.id),
    );
    TestValidator.predicate(
      "karma has score",
      typeof karma.score === "number" && Number.isInteger(karma.score),
    );
    TestValidator.predicate(
      "karma has member object",
      typeof karma.member === "object" && karma.member !== null,
    );
    TestValidator.predicate(
      "karma has created_at",
      typeof karma.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(karma.created_at),
    );
    TestValidator.predicate(
      "karma has updated_at",
      typeof karma.updated_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(karma.updated_at),
    );
    // Validate member structure
    const member = karma.member;
    TestValidator.predicate(
      "member has id",
      typeof member.id === "string" && /^[0-9a-f-]{36}$/i.test(member.id),
    );
    TestValidator.predicate(
      "member has email",
      typeof member.email === "string" &&
        /^[^@]+@[^@]+\.[^@]+$/.test(member.email),
    );
    TestValidator.predicate(
      "member has username",
      typeof member.username === "string" && member.username.length > 0,
    );
    TestValidator.predicate(
      "member has email_verified",
      typeof member.email_verified === "boolean",
    );
    TestValidator.predicate(
      "member has registered_at",
      typeof member.registered_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.registered_at),
    );
    // nickname is optional, last_login_at is optional
    if (member.nickname !== undefined && member.nickname !== null) {
      TestValidator.predicate(
        "member nickname is string if present",
        typeof member.nickname === "string",
      );
    }
    if (member.last_login_at !== undefined && member.last_login_at !== null) {
      TestValidator.predicate(
        "member last_login_at is valid timestamp if present",
        typeof member.last_login_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.last_login_at),
      );
    }
  }
  // Validate pagination calculation consistency
  if (response.pagination.limit > 0 && response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records/limit",
      response.pagination.pages,
      expectedPages,
    );
  }
  // Validate data length consistency with limit
  if (response.pagination.current < response.pagination.pages) {
    TestValidator.equals(
      "data length equals limit on non-last page",
      response.data.length,
      response.pagination.limit,
    );
  } else if (response.pagination.pages > 0) {
    // On last page, data length should be ≤ limit
    TestValidator.predicate(
      "data length ≤ limit on last page",
      response.data.length <= response.pagination.limit,
    );
  }
}
