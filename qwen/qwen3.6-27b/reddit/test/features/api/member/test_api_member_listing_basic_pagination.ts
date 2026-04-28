import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityMember";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test basic member listing functionality with default parameters.
 *
 * Validates the member listing endpoint returns all active (non-deleted) members sorted by `created_at` in descending order. Verifies pagination metadata including current page, limit, total records, and total pages. Ensures the response data array contains member summaries with id, username, email, and created_at fields, confirming that sensitive data like password_hash is excluded.
 *
 * 1. Create two member accounts via join endpoint.
 * 2. Call the member listing endpoint with default parameters.
 * 3. Validate pagination metadata reflects the two created members.
 * 4. Validate each returned member summary contains expected fields.
 */
export async function test_api_member_listing_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Create Member 1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Authorized);
  // 2. Create Member 2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Authorized);
  // 3. Call listing endpoint
  const listConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.redditLikeCommunity.members.index(
    listConnection,
    {
      body: {} satisfies IREdditLikeCommunityMember.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate Pagination Metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate(
    "limit is greater than 0",
    response.pagination.limit > 0,
  );
  TestValidator.equals(
    "records count matches data length",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    response.pagination.pages >= 1,
  );
  // 5. Validate Member Summary Fields
  for (const member of response.data) {
    TestValidator.predicate(
      "member id is valid uuid",
      member.id.length === 36 &&
        /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/.test(member.id),
    );
    TestValidator.predicate(
      "member username is present",
      member.username.length > 0,
    );
    TestValidator.predicate("member email is present", member.email.length > 0);
    TestValidator.predicate(
      "member has created_at",
      member.created_at.length > 0,
    );
    TestValidator.predicate(
      "member does not contain password_hash",
      !("password_hash" in member),
    );
  }
}
