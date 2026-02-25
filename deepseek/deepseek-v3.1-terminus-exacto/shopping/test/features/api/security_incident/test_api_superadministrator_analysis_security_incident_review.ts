import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_superadministrator_analysis_security_incident_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  // First, create a super administrator account
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Configure search criteria for security incident monitoring
  const searchCriteria = {
    metric_name: "security_incident",
    metric_category: "security",
    collection_timestamp_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    collection_timestamp_end: new Date().toISOString(),
    is_aggregated: false,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  // 3. Retrieve analytical data for security incident review
  const response =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      { body: searchCriteria },
    );
  typia.assert(response);
  // 4. Validate response structure (business logic only, no type checking)
  TestValidator.predicate(
    "has valid pagination data",
    () =>
      response.pagination.current >= 0 &&
      response.pagination.limit >= 1 &&
      response.pagination.limit <= 100 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  // 5. Validate security incident data content (business logic only)
  if (response.data.length > 0) {
    const firstItem = response.data[0];
    TestValidator.predicate(
      "has security-related metric category",
      () =>
        firstItem.metric_category.toLowerCase().includes("security") ||
        firstItem.metric_name.toLowerCase().includes("incident") ||
        firstItem.metric_name.toLowerCase().includes("audit"),
    );
    TestValidator.predicate("has recent collection timestamp", () => {
      const timestamp = new Date(firstItem.collection_timestamp);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return timestamp >= weekAgo;
    });
  }
  // 6. Test larger page size for comprehensive security audit
  const largePageCriteria = {
    ...searchCriteria,
    limit: 50, // Larger page size for comprehensive review
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  const largePageResponse =
    await api.functional.ecommerce.superAdministrator.analysis.index(
      superAdminConnection,
      { body: largePageCriteria },
    );
  typia.assert(largePageResponse);
  // 7. Validate that larger page size works properly
  TestValidator.predicate(
    "larger page size accepted",
    () => largePageResponse.pagination.limit === 50,
  );
}
