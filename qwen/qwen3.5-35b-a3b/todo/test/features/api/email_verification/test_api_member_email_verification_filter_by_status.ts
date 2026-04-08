import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_email_verification_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Get baseline - all verification records without status filter
  const allVerifications =
    await api.functional.multiUserTodo.member_email_verifications.index(
      adminConnection,
      {
        body: {
          pagination: { limit: 100 },
        },
      },
    );
  typia.assert(allVerifications);
  // Test active filter - should return only non-expired tokens
  const activeVerifications =
    await api.functional.multiUserTodo.member_email_verifications.index(
      adminConnection,
      {
        body: {
          status: "active",
          pagination: { limit: 100 },
        },
      },
    );
  typia.assert(activeVerifications);
  // Validate all active verifications are actually active (expires_at > current time)
  const currentTime = new Date();
  for (const verification of activeVerifications.data) {
    const expiresAtDate = new Date(verification.expires_at);
    TestValidator.predicate(
      "active verification expires_at in future",
      expiresAtDate > currentTime,
    );
  }
  // Test expired filter - should return only expired tokens (expires_at <= current time)
  const expiredVerifications =
    await api.functional.multiUserTodo.member_email_verifications.index(
      adminConnection,
      {
        body: {
          status: "expired",
          pagination: { limit: 100 },
        },
      },
    );
  typia.assert(expiredVerifications);
  // Validate all expired verifications are actually expired (expires_at <= current time)
  for (const verification of expiredVerifications.data) {
    const expiresAtDate = new Date(verification.expires_at);
    TestValidator.predicate(
      "expired verification expires_at in past",
      expiresAtDate <= currentTime,
    );
  }
  // Verify filters are mutually exclusive - no overlap between active and expired results
  const activeIds = new Set(activeVerifications.data.map((v) => v.id));
  const expiredIds = new Set(expiredVerifications.data.map((v) => v.id));
  for (const activeId of activeIds) {
    TestValidator.predicate(
      "no overlap - active id not found in expired set",
      !expiredIds.has(activeId),
    );
  }
  // Verify pagination counts match filtered results
  TestValidator.equals(
    "active pagination records count matches data length",
    activeVerifications.pagination.records,
    activeVerifications.data.length,
  );
  TestValidator.equals(
    "expired pagination records count matches data length",
    expiredVerifications.pagination.records,
    expiredVerifications.data.length,
  );
  // Test sorting with active filter - descending by expires_at
  const activeSortedByExpiresDesc =
    await api.functional.multiUserTodo.member_email_verifications.index(
      adminConnection,
      {
        body: {
          status: "active",
          sort_by: "expires_at",
          sort_order: "desc",
          pagination: { limit: 50 },
        },
      },
    );
  typia.assert(activeSortedByExpiresDesc);
  // Verify sorted order (descending by expires_at)
  if (activeSortedByExpiresDesc.data.length > 1) {
    for (let i = 1; i < activeSortedByExpiresDesc.data.length; i++) {
      const prev = activeSortedByExpiresDesc.data[i - 1];
      const curr = activeSortedByExpiresDesc.data[i];
      const prevExpires = new Date(prev.expires_at);
      const currExpires = new Date(curr.expires_at);
      TestValidator.predicate(
        "active sorted desc by expires_at",
        prevExpires >= currExpires,
      );
    }
  }
  // Test sorting with expired filter - ascending by created_at
  const expiredSortedByCreatedAsc =
    await api.functional.multiUserTodo.member_email_verifications.index(
      adminConnection,
      {
        body: {
          status: "expired",
          sort_by: "created_at",
          sort_order: "asc",
          pagination: { limit: 50 },
        },
      },
    );
  typia.assert(expiredSortedByCreatedAsc);
  // Verify sorted order (ascending by created_at)
  if (expiredSortedByCreatedAsc.data.length > 1) {
    for (let i = 1; i < expiredSortedByCreatedAsc.data.length; i++) {
      const prev = expiredSortedByCreatedAsc.data[i - 1];
      const curr = expiredSortedByCreatedAsc.data[i];
      const prevCreated = new Date(prev.created_at);
      const currCreated = new Date(curr.created_at);
      TestValidator.predicate(
        "expired sorted asc by created_at",
        prevCreated <= currCreated,
      );
    }
  }
  // Test combined filters - email + status (if we have any records)
  if (allVerifications.data.length > 0) {
    const testEmail = allVerifications.data[0].email;
    const filteredWithEmail =
      await api.functional.multiUserTodo.member_email_verifications.index(
        adminConnection,
        {
          body: {
            email: testEmail,
            status: "active",
            pagination: { limit: 100 },
          },
        },
      );
    typia.assert(filteredWithEmail);
    // Verify all results match the email filter
    for (const verification of filteredWithEmail.data) {
      TestValidator.equals(
        "email filter matches returned verifications",
        verification.email,
        testEmail,
      );
    }
  }
  // Test pagination beyond results
  const paginationBeyond =
    await api.functional.multiUserTodo.member_email_verifications.index(
      adminConnection,
      {
        body: {
          status: "active",
          pagination: { limit: 1, page: 100 },
        },
      },
    );
  typia.assert(paginationBeyond);
  TestValidator.equals(
    "pagination beyond results returns empty array",
    paginationBeyond.data.length,
    0,
  );
}
