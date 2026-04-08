import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      email: `${RandomGenerator.name().toLowerCase()}@example.com`,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test pending status filter
  const pendingPage =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "pending" as const,
          limit: 100,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(pendingPage);
  // Verify all pending verifications have correct flags
  for (const verification of pendingPage.data) {
    typia.assert(verification);
    TestValidator.equals(
      "pending is_pending flag",
      verification.is_pending,
      true,
    );
    TestValidator.equals(
      "pending is_verified flag",
      verification.is_verified,
      false,
    );
    TestValidator.equals(
      "pending is_expired flag",
      verification.is_expired,
      false,
    );
  }
  // Test empty result handling for pending status
  if (pendingPage.data.length === 0) {
    TestValidator.equals(
      "pending pagination records",
      pendingPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "pending pagination pages",
      pendingPage.pagination.pages,
      0,
    );
  }
  // 3. Test verified status filter
  const verifiedPage =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "verified" as const,
          limit: 100,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedPage);
  // Verify all verified verifications have correct flags
  for (const verification of verifiedPage.data) {
    typia.assert(verification);
    TestValidator.equals(
      "verified is_verified flag",
      verification.is_verified,
      true,
    );
  }
  // Test empty result handling for verified status
  if (verifiedPage.data.length === 0) {
    TestValidator.equals(
      "verified pagination records",
      verifiedPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "verified pagination pages",
      verifiedPage.pagination.pages,
      0,
    );
  }
  // 4. Test expired status filter
  const expiredPage =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "expired" as const,
          limit: 100,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredPage);
  // Verify all expired verifications have correct flags
  for (const verification of expiredPage.data) {
    typia.assert(verification);
    TestValidator.equals(
      "expired is_expired flag",
      verification.is_expired,
      true,
    );
    TestValidator.equals(
      "expired is_pending flag",
      verification.is_pending,
      false,
    );
  }
  // Test empty result handling for expired status
  if (expiredPage.data.length === 0) {
    TestValidator.equals(
      "expired pagination records",
      expiredPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "expired pagination pages",
      expiredPage.pagination.pages,
      0,
    );
  }
  // 5. Test deleted status filter
  const deletedPage =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          status: "deleted" as const,
          limit: 100,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(deletedPage);
  // Verify all deleted verifications have correct flags
  for (const verification of deletedPage.data) {
    typia.assert(verification);
    TestValidator.equals(
      "deleted is_deleted flag",
      verification.is_deleted,
      true,
    );
  }
  // Test empty result handling for deleted status
  if (deletedPage.data.length === 0) {
    TestValidator.equals(
      "deleted pagination records",
      deletedPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "deleted pagination pages",
      deletedPage.pagination.pages,
      0,
    );
  }
  // 6. Test default behavior (no status filter) excludes deleted
  const defaultPage =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          limit: 100,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Ensure no deleted verifications in default results
  const hasDeletedInDefault = defaultPage.data.some((v) => v.is_deleted);
  TestValidator.predicate("default excludes deleted", !hasDeletedInDefault);
  // 7. Test filtering with member_id
  const filteredByMember =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: member.member.id,
          status: "pending" as const,
          limit: 100,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(filteredByMember);
  // Verify all returned verifications belong to the member
  for (const verification of filteredByMember.data) {
    typia.assert(verification);
    TestValidator.equals(
      "member_id match",
      verification.member.id,
      member.member.id,
    );
  }
  // 8. Test filtering with date ranges (created_at_from, expires_at_to)
  const dateRangePage =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          created_at_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          expires_at_to: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          limit: 100,
        } satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(dateRangePage);
  // Verify all returned verifications are within date range
  for (const verification of dateRangePage.data) {
    typia.assert(verification);
    const createdAt = new Date(verification.created_at);
    const expiresAt = new Date(verification.expires_at);
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    TestValidator.predicate(
      "created_at in range",
      createdAt >= fromDate && createdAt <= toDate,
    );
    TestValidator.predicate(
      "expires_at in range",
      expiresAt >= fromDate && expiresAt <= toDate,
    );
  }
}
