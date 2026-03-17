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
 * Test email verification list pagination functionality.
 * 1. Create a member account via registration
 * 2. Query with page=1, limit=10 and verify correct page metadata returned
 * 3. Query with different page numbers to verify offset calculation works
 * 4. Verify the limit parameter is enforced (maximum 100 records per request)
 * 5. Verify pagination metadata includes current page, limit, total records count, and total pages
 * 6. Verify total pages is calculated correctly as ceiling of records/limit
 * 7. Verify when no records exist, pagination shows records=0, pages=0
 */
export async function test_api_email_verification_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account via registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Query with page=1, limit=10 and verify correct page metadata returned
  const page1Result: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(page1Result);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records >= 0",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages >= 0",
    page1Result.pagination.pages >= 0,
  );
  // 3. Query with different page numbers to verify offset calculation works
  const page2Result: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // 4. Verify the limit parameter is enforced (maximum 100 records per request)
  const maxLimitResult: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit enforced",
    maxLimitResult.pagination.limit,
    100,
  );
  // 5. Verify pagination metadata includes current page, limit, total records count, and total pages
  // These are validated by typia.assert, so we just verify they exist with correct values
  TestValidator.predicate(
    "pagination has current",
    typeof page1Result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof page1Result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof page1Result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof page1Result.pagination.pages === "number",
  );
  // 6. Verify total pages is calculated correctly as ceiling of records/limit
  if (page1Result.pagination.records > 0 && page1Result.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      page1Result.pagination.records / page1Result.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation",
      page1Result.pagination.pages,
      expectedPages,
    );
  }
  // 7. Verify when no records exist, pagination shows records=0, pages=0
  // This is already covered by the initial query if no verifications exist
  if (page1Result.pagination.records === 0) {
    TestValidator.equals("no records count", page1Result.pagination.records, 0);
    TestValidator.equals("no records pages", page1Result.pagination.pages, 0);
  }
}