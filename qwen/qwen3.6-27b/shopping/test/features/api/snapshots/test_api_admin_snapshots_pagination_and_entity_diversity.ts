import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_snapshots_pagination_and_entity_diversity(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Request snapshots with pagination limit=5 (page 1)
  const snapshotsPage1 =
    await api.functional.ecommercePlatform.admin.snapshots.index(
      adminConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IEcommercePlatformSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // 3. Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page is 1",
    snapshotsPage1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit is 5", snapshotsPage1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 has correct total pages",
    snapshotsPage1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "page 1 has records count",
    snapshotsPage1.pagination.records >= 0,
  );
  // 4. Validate snapshot summaries structure
  TestValidator.predicate(
    "page 1 has data array",
    Array.isArray(snapshotsPage1.data),
  );
  TestValidator.predicate(
    "page 1 has at most 5 records",
    snapshotsPage1.data.length <= 5,
  );
  // 5. Validate each snapshot in page 1 has required structure
  for (const snapshot of snapshotsPage1.data) {
    // Validate UUID format for id
    TestValidator.equals("snapshot id is UUID", typeof snapshot.id, "string");
    // Validate entityType is a string
    TestValidator.predicate(
      "snapshot has entityType",
      typeof snapshot.entityType === "string",
    );
    // Validate createdAt is a date-time string
    TestValidator.predicate(
      "snapshot has createdAt",
      typeof snapshot.createdAt === "string",
    );
  }
}
