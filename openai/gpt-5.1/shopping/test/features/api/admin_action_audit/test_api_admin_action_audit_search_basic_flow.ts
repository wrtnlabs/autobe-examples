import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionAudit";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate basic search flow for admin action audits by a platform
 * administrator.
 *
 * Business context:
 *
 * - Platform admins perform various actions (e.g., catalog management) that are
 *   recorded in shopping_mall_admin_action_audits.
 * - Compliance, security, and operations require that these audit logs are
 *   searchable and presented in a paginated format.
 *
 * This test validates the happy path where:
 *
 * 1. A platform admin is registered and authenticated.
 * 2. The platform admin performs an obvious auditable action (brand creation).
 * 3. The admin then calls the admin action audit search endpoint with basic
 *    pagination and a time window covering the recent action.
 * 4. The response is a valid IPageIShoppingMallAdminActionAudit.ISummary page.
 * 5. At least one audit record is found whose target_id matches the created brand
 *    id and whose core summary fields are populated.
 */
export async function test_api_admin_action_audit_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "AdminPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Perform an auditable admin action: create a brand.
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(12)}`;
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(createdBrand);

  // 3. Build an audit search request covering the timeframe of the action.
  const now = new Date();
  const fiveMinutesMs = 5 * 60 * 1000;
  const occurredFrom = new Date(now.getTime() - fiveMinutesMs).toISOString();
  const occurredTo = new Date(now.getTime() + fiveMinutesMs).toISOString();

  const searchRequestBody = {
    page: 1,
    limit: 20,
    adminId: adminAuthorized.id,
    occurredFrom,
    occurredTo,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const page: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminActionAudits.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;
  const data = page.data;

  // 4. Pagination metadata coherence checks.
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination.limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination.records is >= data length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  if (pagination.pages === 0) {
    TestValidator.equals("no pages implies no records", pagination.records, 0);
    TestValidator.equals("no pages implies no data entries", data.length, 0);
  } else {
    TestValidator.predicate(
      "having pages implies at least one record",
      pagination.records > 0,
    );
  }

  // 5. Validate that at least one audit record references the created brand.
  const relatedAudit: IShoppingMallAdminActionAudit.ISummary | undefined =
    data.find((audit) => audit.target_id === createdBrand.id);

  TestValidator.predicate(
    "at least one audit record should reference the created brand by target_id",
    relatedAudit !== undefined,
  );

  if (relatedAudit !== undefined) {
    TestValidator.predicate(
      "related audit has non-empty action_type",
      relatedAudit.action_type.length > 0,
    );
    TestValidator.predicate(
      "related audit has non-empty target_type",
      relatedAudit.target_type.length > 0,
    );
    TestValidator.predicate(
      "related audit has non-empty summary_message",
      relatedAudit.summary_message.length > 0,
    );
    TestValidator.predicate(
      "related audit has non-empty id",
      relatedAudit.id.length > 0,
    );
  }
}
