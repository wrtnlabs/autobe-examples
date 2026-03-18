import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verifications_filter_by_status_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create new connection with token for subsequent requests
  const memberTokenConnection: api.IConnection = { host: connection.host };
  memberTokenConnection.headers = {
    ...connection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Create email verification records by changing password
  // First change password creates verification token
  await api.functional.hrms.member.password_resets.changePassword(
    memberTokenConnection,
    {
      body: {
        currentPassword: memberAuth.token.access,
        newPassword: "newSecurePassword123!",
      } satisfies IHrmsMember.IChangePassword,
    },
  );
  // Second change password creates another verification token
  await api.functional.hrms.member.password_resets.changePassword(
    memberTokenConnection,
    {
      body: {
        currentPassword: "newSecurePassword123!",
        newPassword: "anotherSecurePassword456!",
      } satisfies IHrmsMember.IChangePassword,
    },
  );
  // 3. Query email verifications with different filters and sorts
  const defaultQuery = {
    limit: 50,
    page: 1,
  } satisfies IHrmsMemberEmailVerification.IRequest;
  // Test default query (no status filter)
  const allVerifications =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: defaultQuery },
    );
  typia.assert(allVerifications);
  // Test status='active' filter
  const activeQuery = {
    ...defaultQuery,
    status: "active",
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const activeVerifications =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: activeQuery },
    );
  typia.assert(activeVerifications);
  // Verify all active verifications have status='active' in response
  for (const verification of activeVerifications.data) {
    TestValidator.equals(
      "active filter returns active status",
      verification.status,
      "active",
    );
  }
  // Test status='used' filter
  const usedQuery = {
    ...defaultQuery,
    status: "used",
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const usedVerifications =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: usedQuery },
    );
  typia.assert(usedVerifications);
  // Verify all used verifications have status='used' in response
  for (const verification of usedVerifications.data) {
    TestValidator.equals(
      "used filter returns used status",
      verification.status,
      "used",
    );
  }
  // 4. Test sorting by created_at
  // Ascending order
  const sortByCreatedAtAsc = {
    ...defaultQuery,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const sortedByCreatedAtAsc =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: sortByCreatedAtAsc },
    );
  typia.assert(sortedByCreatedAtAsc);
  // Verify sorting order is ascending
  if (sortedByCreatedAtAsc.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAtAsc.data.length; i++) {
      const prevDate = sortedByCreatedAtAsc.data[i - 1].created_at;
      const currDate = sortedByCreatedAtAsc.data[i].created_at;
      TestValidator.predicate(
        `created_at ascending order for index ${i}`,
        new Date(prevDate) <= new Date(currDate),
      );
    }
  }
  // Descending order
  const sortByCreatedAtDesc = {
    ...defaultQuery,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const sortedByCreatedAtDesc =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: sortByCreatedAtDesc },
    );
  typia.assert(sortedByCreatedAtDesc);
  // Verify sorting order is descending
  if (sortedByCreatedAtDesc.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAtDesc.data.length; i++) {
      const prevDate = sortedByCreatedAtDesc.data[i - 1].created_at;
      const currDate = sortedByCreatedAtDesc.data[i].created_at;
      TestValidator.predicate(
        `created_at descending order for index ${i}`,
        new Date(prevDate) >= new Date(currDate),
      );
    }
  }
  // 5. Test sorting by expires_at
  // Ascending order
  const sortByExpiresAtAsc = {
    ...defaultQuery,
    sort_by: "expires_at",
    sort_order: "asc",
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const sortedByExpiresAtAsc =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: sortByExpiresAtAsc },
    );
  typia.assert(sortedByExpiresAtAsc);
  // Verify sorting order is ascending
  if (sortedByExpiresAtAsc.data.length > 1) {
    for (let i = 1; i < sortedByExpiresAtAsc.data.length; i++) {
      const prevDate = sortedByExpiresAtAsc.data[i - 1].expires_at;
      const currDate = sortedByExpiresAtAsc.data[i].expires_at;
      TestValidator.predicate(
        `expires_at ascending order for index ${i}`,
        new Date(prevDate) <= new Date(currDate),
      );
    }
  }
  // Descending order
  const sortByExpiresAtDesc = {
    ...defaultQuery,
    sort_by: "expires_at",
    sort_order: "desc",
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const sortedByExpiresAtDesc =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: sortByExpiresAtDesc },
    );
  typia.assert(sortedByExpiresAtDesc);
  // Verify sorting order is descending
  if (sortedByExpiresAtDesc.data.length > 1) {
    for (let i = 1; i < sortedByExpiresAtDesc.data.length; i++) {
      const prevDate = sortedByExpiresAtDesc.data[i - 1].expires_at;
      const currDate = sortedByExpiresAtDesc.data[i].expires_at;
      TestValidator.predicate(
        `expires_at descending order for index ${i}`,
        new Date(prevDate) >= new Date(currDate),
      );
    }
  }
  // 6. Test pagination with different limit values
  const limit10Query = {
    limit: 10,
    page: 1,
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const pageWithLimit10 =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: limit10Query },
    );
  typia.assert(pageWithLimit10);
  TestValidator.equals(
    "limit 10 pagination",
    pageWithLimit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit 10 pagination page",
    pageWithLimit10.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit 10 pagination returns correct number of records",
    pageWithLimit10.data.length <= 10,
  );
  // Test with limit 50 (max allowed)
  const limit50Query = {
    limit: 50,
    page: 1,
  } satisfies IHrmsMemberEmailVerification.IRequest;
  const pageWithLimit50 =
    await api.functional.hrms.member.email_verifications.index(
      memberTokenConnection,
      { body: limit50Query },
    );
  typia.assert(pageWithLimit50);
  TestValidator.equals(
    "limit 50 pagination",
    pageWithLimit50.pagination.limit,
    50,
  );
  // 7. Test pagination metadata
  const expectedPages =
    pageWithLimit50.pagination.records > 0
      ? Math.ceil(pageWithLimit50.pagination.records / 50)
      : 0;
  TestValidator.equals(
    "pagination has valid pages count",
    pageWithLimit50.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    pageWithLimit50.pagination.records >= pageWithLimit50.data.length,
  );
}
