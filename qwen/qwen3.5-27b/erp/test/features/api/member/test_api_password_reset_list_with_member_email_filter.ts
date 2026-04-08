import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the password reset listing functionality with member email filtering.
 *
 * Validates the password reset list endpoint's ability to filter records by member email address. Tests both successful filtering with existing member emails and empty result handling with non-existent emails. Verifies that the JOIN with members table works correctly and that pagination metadata is accurate.
 *
 * Special attention is given to verifying that the member_email filter performs exact matching and that the response includes complete member information for each password reset token.
 *
 * 1. Authenticate as a member using authorize_member_join utility function.
 * 2. Call password reset list with member_email filter set to authenticated member's email.
 * 3. Verify response structure includes all required fields and member object.
 * 4. Test with non-existent email and verify empty data array with correct pagination.
 * 5. Verify pagination metadata is correctly populated in both scenarios.
 */
export async function test_api_password_reset_list_with_member_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(authorized);
  const memberEmail = authorized.email;
  // 2. Call password reset list with member_email filter
  const result = await api.functional.hrmTimeTrack.member.password_resets.index(
    memberConnection,
    {
      body: {
        member_email: memberEmail,
      } satisfies IHrmTimeTrackMemberPasswordReset.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify response structure
  TestValidator.predicate(
    "has pagination object",
    result.pagination !== undefined,
  );
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.predicate("has valid limit", result.pagination.limit > 0);
  TestValidator.predicate(
    "has valid records count",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    result.pagination.pages >= 0,
  );
  // 4. Verify data array structure (may be empty if no password resets exist)
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. If data exists, verify each item has correct structure
  if (result.data.length > 0) {
    const firstItem = result.data[0];
    TestValidator.predicate("first item has id", firstItem.id !== undefined);
    TestValidator.predicate(
      "first item has token",
      firstItem.token !== undefined,
    );
    TestValidator.predicate(
      "first item has created_at",
      firstItem.created_at !== undefined,
    );
    TestValidator.predicate(
      "first item has expired_at",
      firstItem.expired_at !== undefined,
    );
    TestValidator.predicate(
      "first item has member",
      firstItem.member !== undefined,
    );
    TestValidator.equals(
      "member email matches filter",
      firstItem.member.email,
      memberEmail,
    );
  }
  // 6. Test with non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const emptyResult =
    await api.functional.hrmTimeTrack.member.password_resets.index(
      memberConnection,
      {
        body: {
          member_email: nonExistentEmail,
        } satisfies IHrmTimeTrackMemberPasswordReset.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 7. Verify empty result has correct pagination
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
}
