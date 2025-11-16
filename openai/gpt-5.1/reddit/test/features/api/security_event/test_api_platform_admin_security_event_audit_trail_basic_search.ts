import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSecurityEvent";

/**
 * Validate that a platform administrator can retrieve a paginated audit trail
 * of security events using minimal search criteria.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin via /auth/platformAdmin/join.
 * 2. Seed at least one account status via
 *    /communityPlatform/platformAdmin/accountStatuses.
 * 3. Issue a minimal auditTrail search request with only pagination fields.
 * 4. Assert that the response structure matches
 *    IPageICommunityPlatformUserSecurityEvent.ISummary.
 * 5. Validate pagination metadata and basic invariants.
 * 6. When events exist, validate that each summary item is structurally sound
 *    according to ICommunityPlatformUserSecurityEvent.ISummary.
 */
export async function test_api_platform_admin_security_event_audit_trail_basic_search(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Seed at least one account status for consistency of account_status_id.
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Build minimal auditTrail search request with only pagination fields.
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  // 4. Call auditTrail index endpoint.
  const pageResult: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.securityEvents.auditTrail.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageICommunityPlatformUserSecurityEvent.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const data: ICommunityPlatformUserSecurityEvent.ISummary[] = pageResult.data;

  // 5. Validate pagination metadata.
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, pages should be 0",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when there are records, pages should be at least 1",
      pagination.pages >= 1,
    );
  }

  // 6. Validate relationship between pagination limit and data length.
  TestValidator.predicate(
    "data length should not exceed pagination limit",
    data.length <= pagination.limit,
  );

  // 7. Validate each summary item when records exist.
  if (data.length > 0) {
    for (const event of data) {
      // Ensure basic structural soundness using typia.
      typia.assert<ICommunityPlatformUserSecurityEvent.ISummary>(event);

      TestValidator.predicate(
        "event id should be non-empty",
        event.id.length > 0,
      );

      TestValidator.predicate(
        "event_type should be non-empty",
        event.event_type.length > 0,
      );

      TestValidator.predicate(
        "severity_level should be non-empty",
        event.severity_level.length > 0,
      );

      TestValidator.predicate(
        "actor_type should be non-empty",
        event.actor_type.length > 0,
      );

      TestValidator.predicate(
        "actor_id should be non-empty",
        event.actor_id.length > 0,
      );

      TestValidator.predicate(
        "occurred_at should be non-empty",
        event.occurred_at.length > 0,
      );

      if (event.ip_address !== undefined) {
        TestValidator.predicate(
          "ip_address, when present, should be non-empty",
          event.ip_address.length > 0,
        );
      }

      if (event.user_agent_summary !== undefined) {
        TestValidator.predicate(
          "user_agent_summary, when present, should be non-empty",
          event.user_agent_summary.length > 0,
        );
      }
    }
  }
}
