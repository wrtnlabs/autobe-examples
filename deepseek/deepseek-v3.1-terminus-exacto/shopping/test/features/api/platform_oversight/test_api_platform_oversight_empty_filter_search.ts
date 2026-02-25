import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOversight";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_platform_oversight_empty_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test 1: Empty filter with default pagination
  const emptyFilterRequest: IEcommercePlatformOversight.IRequest = {
    page: 1,
    limit: 20,
  };
  const emptyFilterResponse =
    await api.functional.ecommerce.superAdministrator.platform_oversight.index(
      superAdminConnection,
      { body: emptyFilterRequest },
    );
  typia.assert(emptyFilterResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure type",
    typeof emptyFilterResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current property",
    "current" in emptyFilterResponse.pagination,
  );
  TestValidator.predicate(
    "pagination has limit property",
    "limit" in emptyFilterResponse.pagination,
  );
  TestValidator.predicate(
    "pagination has records property",
    "records" in emptyFilterResponse.pagination,
  );
  TestValidator.predicate(
    "pagination has pages property",
    "pages" in emptyFilterResponse.pagination,
  );
  // Validate data array structure for each oversight record
  if (emptyFilterResponse.data.length > 0) {
    const sampleRecord = emptyFilterResponse.data[0];
    TestValidator.predicate("record has id", "id" in sampleRecord);
    TestValidator.predicate(
      "record has oversight_type",
      "oversight_type" in sampleRecord,
    );
    TestValidator.predicate(
      "record has severity_level",
      "severity_level" in sampleRecord,
    );
    TestValidator.predicate("record has resolved", "resolved" in sampleRecord);
    TestValidator.predicate(
      "record has administrator",
      "administrator" in sampleRecord,
    );
    TestValidator.predicate(
      "record has created_at",
      "created_at" in sampleRecord,
    );
    // Validate administrator summary structure
    if (sampleRecord.administrator) {
      TestValidator.predicate(
        "administrator has id",
        "id" in sampleRecord.administrator,
      );
      TestValidator.predicate(
        "administrator has email",
        "email" in sampleRecord.administrator,
      );
      TestValidator.predicate(
        "administrator has created_at",
        "created_at" in sampleRecord.administrator,
      );
    }
  }
  // Test 2: Empty filter with small limit (5)
  const smallLimitRequest: IEcommercePlatformOversight.IRequest = {
    page: 1,
    limit: 5,
  };
  const smallLimitResponse =
    await api.functional.ecommerce.superAdministrator.platform_oversight.index(
      superAdminConnection,
      { body: smallLimitRequest },
    );
  typia.assert(smallLimitResponse);
  TestValidator.predicate(
    "small limit respects pagination",
    smallLimitResponse.data.length <= 5,
  );
  TestValidator.equals(
    "small limit matches request",
    smallLimitResponse.pagination.limit,
    5,
  );
  // Test 3: Empty filter with large limit (50)
  const largeLimitRequest: IEcommercePlatformOversight.IRequest = {
    page: 1,
    limit: 50,
  };
  const largeLimitResponse =
    await api.functional.ecommerce.superAdministrator.platform_oversight.index(
      superAdminConnection,
      { body: largeLimitRequest },
    );
  typia.assert(largeLimitResponse);
  TestValidator.predicate(
    "large limit respects pagination",
    largeLimitResponse.data.length <= 50,
  );
  TestValidator.equals(
    "large limit matches request",
    largeLimitResponse.pagination.limit,
    50,
  );
  // Test 4: Complete null filter (all optional fields null)
  const nullFilterRequest: IEcommercePlatformOversight.IRequest = {
    oversight_type: null,
    severity_level: null,
    resolved: null,
    page: 1,
    limit: 20,
  };
  const nullFilterResponse =
    await api.functional.ecommerce.superAdministrator.platform_oversight.index(
      superAdminConnection,
      { body: nullFilterRequest },
    );
  typia.assert(nullFilterResponse);
  // Verify sorting behavior by checking if records are in descending order by created_at
  if (emptyFilterResponse.data.length > 1) {
    for (let i = 0; i < emptyFilterResponse.data.length - 1; i++) {
      const current = new Date(emptyFilterResponse.data[i].created_at);
      const next = new Date(emptyFilterResponse.data[i + 1].created_at);
      TestValidator.predicate(
        "records sorted descending by created_at",
        current >= next,
      );
    }
  }
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "records count is non-negative",
    emptyFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "current page is valid",
    emptyFilterResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    emptyFilterResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pages count is consistent",
    emptyFilterResponse.pagination.pages >= 0,
  );
  if (emptyFilterResponse.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation is correct",
      emptyFilterResponse.pagination.pages ===
        Math.ceil(
          emptyFilterResponse.pagination.records /
            emptyFilterResponse.pagination.limit,
        ),
    );
  }
}
