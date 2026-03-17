import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberEmailVerification";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve their own email verification records with proper pagination.
 * 1. Create a member account via registration
 * 2. Query the email verification list endpoint
 * 3. Verify the response contains the member's verification records
 * 4. Verify pagination metadata is correct
 * 5. Verify each record contains essential fields
 * 6. Verify member_id filter is automatically applied
 * 7. Verify soft-deleted records are excluded
 */
export async function test_api_email_verification_list_member_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account via registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Query the email verification list endpoint
  const result: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(result);
  // 3. Verify the response structure
  TestValidator.predicate(
    "pagination exists",
    result.pagination !== null && result.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // 4. Verify pagination metadata is correct
  TestValidator.predicate(
    "current page is positive",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Verify each record contains essential fields
  for (const record of result.data) {
    typia.assert(record);
    // Verify member reference exists (should be the authenticated member)
    TestValidator.predicate("record has member", record.member !== null);
    if (record.member) {
      typia.assert(record.member);
      TestValidator.equals(
        "member id matches authenticated member",
        record.member.id,
        authResult.id,
      );
    }
    // Verify deleted_at is null (soft-deleted records excluded)
    TestValidator.equals("deleted_at is null", record.deleted_at, null);
  }
  // 6. Verify member_id filter is automatically applied (all records belong to authenticated member)
  const allRecordsBelongToMember = result.data.every(
    (record) => record.member?.id === authResult.id,
  );
  TestValidator.predicate(
    "all records belong to authenticated member",
    allRecordsBelongToMember,
  );
}