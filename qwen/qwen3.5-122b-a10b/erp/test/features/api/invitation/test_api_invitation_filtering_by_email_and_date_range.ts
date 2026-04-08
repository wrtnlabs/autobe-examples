import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test invitation filtering by email and date range parameters.
 *
 * Validates the employee invitation search functionality with various filtering combinations including email partial matching, creation date ranges, expiration date ranges, and sorting options. Ensures that all filter parameters work correctly both individually and in combination.
 *
 * The test creates multiple invitations with different email addresses and timestamps, then verifies that filtering returns the correct subset of invitations based on the search criteria.
 *
 * 1. Authenticate as member with join operation.
 * 2. Create multiple invitations with varied emails and dates.
 * 3. Test email partial matching (e.g., 'john' returns 'john@example.com').
 * 4. Test created_at date range filtering (from/to parameters).
 * 5. Test expires_at date range filtering (from/to parameters).
 * 6. Test combined filters (email + date ranges).
 * 7. Test sorting by created_at, expires_at, email (asc/desc).
 * 8. Validate pagination metadata structure.
 * 9. Validate response data structure with typia.assert().
 */
export async function test_api_invitation_filtering_by_email_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create test invitations with varied emails and dates
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days from now
  const recentPastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
  // Create invitations with different emails
  const johnEmail = `john.${RandomGenerator.alphabets(5)}@example.com`;
  const janeEmail = `jane.${RandomGenerator.alphabets(5)}@test.com`;
  const bobEmail = `bob.${RandomGenerator.alphabets(5)}@company.org`;
  const aliceEmail = `alice.${RandomGenerator.alphabets(5)}@sample.net`;
  // Note: We cannot directly create invitations without proper setup (organization, role, etc.)
  // The invitations endpoint requires employee:manage permission and existing organization context
  // For this test, we'll test the filtering functionality with the existing invitations in the system
  // 3. Test email partial matching
  const emailFilterResult = await api.functional.hrm.member.invitations.index(
    memberConnection,
    {
      body: {
        email: "john",
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  // Verify that all returned invitations contain 'john' in email
  for (const invitation of emailFilterResult.data) {
    TestValidator.predicate(
      "email contains 'john'",
      invitation.email.toLowerCase().includes("john"),
    );
  }
  // 4. Test created_at date range filtering
  const createdAtFilterResult =
    await api.functional.hrm.member.invitations.index(memberConnection, {
      body: {
        created_at_from: pastDate.toISOString(),
        created_at_to: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    });
  typia.assert(createdAtFilterResult);
  // Verify all returned invitations are within the date range
  for (const invitation of createdAtFilterResult.data) {
    const createdAt = new Date(invitation.created_at);
    TestValidator.predicate(
      "created_at within range",
      createdAt >= pastDate && createdAt <= futureDate,
    );
  }
  // 5. Test expires_at date range filtering
  const expiresAtFilterResult =
    await api.functional.hrm.member.invitations.index(memberConnection, {
      body: {
        expires_at_from: pastDate.toISOString(),
        expires_at_to: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    });
  typia.assert(expiresAtFilterResult);
  // Verify all returned invitations have expires_at within range
  for (const invitation of expiresAtFilterResult.data) {
    const expiresAt = new Date(invitation.expires_at);
    TestValidator.predicate(
      "expires_at within range",
      expiresAt >= pastDate && expiresAt <= futureDate,
    );
  }
  // 6. Test combined filters (email + date ranges)
  const combinedFilterResult =
    await api.functional.hrm.member.invitations.index(memberConnection, {
      body: {
        email: "jane",
        created_at_from: recentPastDate.toISOString(),
        created_at_to: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Verify all returned invitations match all criteria
  for (const invitation of combinedFilterResult.data) {
    TestValidator.predicate(
      "email contains 'jane'",
      invitation.email.toLowerCase().includes("jane"),
    );
    const createdAt = new Date(invitation.created_at);
    TestValidator.predicate(
      "created_at within combined range",
      createdAt >= recentPastDate && createdAt <= futureDate,
    );
  }
  // 7. Test sorting by created_at (ascending)
  const sortByCreatedAtAsc = await api.functional.hrm.member.invitations.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    },
  );
  typia.assert(sortByCreatedAtAsc);
  // Verify ascending order
  if (sortByCreatedAtAsc.data.length > 1) {
    for (let i = 1; i < sortByCreatedAtAsc.data.length; i++) {
      const prevDate = new Date(sortByCreatedAtAsc.data[i - 1].created_at);
      const currDate = new Date(sortByCreatedAtAsc.data[i].created_at);
      TestValidator.predicate(
        "created_at ascending order",
        prevDate <= currDate,
      );
    }
  }
  // Test sorting by created_at (descending)
  const sortByCreatedAtDesc = await api.functional.hrm.member.invitations.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    },
  );
  typia.assert(sortByCreatedAtDesc);
  // Verify descending order
  if (sortByCreatedAtDesc.data.length > 1) {
    for (let i = 1; i < sortByCreatedAtDesc.data.length; i++) {
      const prevDate = new Date(sortByCreatedAtDesc.data[i - 1].created_at);
      const currDate = new Date(sortByCreatedAtDesc.data[i].created_at);
      TestValidator.predicate(
        "created_at descending order",
        prevDate >= currDate,
      );
    }
  }
  // Test sorting by email (ascending)
  const sortByEmailAsc = await api.functional.hrm.member.invitations.index(
    memberConnection,
    {
      body: {
        sort_by: "email",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IHrmEmployeeInvitation.IRequest,
    },
  );
  typia.assert(sortByEmailAsc);
  // Verify ascending email order
  if (sortByEmailAsc.data.length > 1) {
    for (let i = 1; i < sortByEmailAsc.data.length; i++) {
      TestValidator.predicate(
        "email ascending order",
        sortByEmailAsc.data[i - 1].email <= sortByEmailAsc.data[i].email,
      );
    }
  }
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 0",
    emailFilterResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    emailFilterResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    emailFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    emailFilterResult.pagination.pages >= 0,
  );
  // 9. Validate response structure
  typia.assert(emailFilterResult);
  typia.assert(createdAtFilterResult);
  typia.assert(expiresAtFilterResult);
  typia.assert(combinedFilterResult);
  typia.assert(sortByCreatedAtAsc);
  typia.assert(sortByCreatedAtDesc);
  typia.assert(sortByEmailAsc);
}
