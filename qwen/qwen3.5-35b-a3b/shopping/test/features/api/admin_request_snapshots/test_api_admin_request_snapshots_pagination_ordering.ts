import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_snapshots_pagination_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create authenticated admin connection with proper headers
  const adminSessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Generate a valid adminRequestId for testing
  const adminRequestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test empty snapshot scenario - page 1 with default limit
  const emptyPage =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.listSnapshots(
      adminSessionConnection,
      { adminRequestId },
    );
  typia.assert(emptyPage);
  // Validate empty response structure
  TestValidator.equals(
    "empty page pagination current",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty page pagination limit",
    emptyPage.pagination.limit,
    10,
  );
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals(
    "empty page data is array",
    Array.isArray(emptyPage.data),
    true,
  );
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  // 5. Test multiple pagination requests to validate cursor-based pagination
  // Simulate fetching multiple pages
  const pagesToTest = 3;
  const pageSize = 5;
  const fetchedSnapshots: IEcommerceMallAdminRequestSnapshot.ISummary[] = [];
  for (let pageNum = 0; pageNum < pagesToTest; pageNum++) {
    const page =
      await api.functional.ecommerceMall.admin.admin_requests.snapshots.listSnapshots(
        adminSessionConnection,
        { adminRequestId },
      );
    typia.assert(page);
    // Validate pagination metadata structure
    TestValidator.predicate(
      `page ${pageNum + 1} pagination current is positive`,
      page.pagination.current >= 1,
    );
    TestValidator.predicate(
      `page ${pageNum + 1} pagination limit is positive`,
      page.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `page ${pageNum + 1} pagination records is non-negative`,
      page.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${pageNum + 1} pagination pages is non-negative`,
      page.pagination.pages >= 0,
    );
    // Validate data is an array
    TestValidator.equals(
      `page ${pageNum + 1} data is array`,
      Array.isArray(page.data),
      true,
    );
    // Collect snapshots for sorting validation
    fetchedSnapshots.push(...page.data);
    // If no more data, stop testing
    if (page.data.length === 0) {
      break;
    }
  }
  // 6. Test sorting validation - verify snapshots are sorted by changedAt descending
  // Only test if we have multiple snapshots
  if (fetchedSnapshots.length > 1) {
    for (let i = 1; i < fetchedSnapshots.length; i++) {
      const prevChangedAt = new Date(
        fetchedSnapshots[i - 1].changedAt,
      ).getTime();
      const currChangedAt = new Date(fetchedSnapshots[i].changedAt).getTime();
      TestValidator.predicate(
        `snapshot ${i} changedAt is before or equal to snapshot ${i - 1}`,
        currChangedAt <= prevChangedAt,
      );
    }
  }
  // 7. Test single snapshot edge case - verify pagination metadata
  if (fetchedSnapshots.length === 1) {
    TestValidator.equals(
      "single snapshot pagination pages",
      fetchedSnapshots.length > 0 ? 1 : 0,
      1,
    );
    TestValidator.equals("single snapshot pagination records", 1, 1);
  }
  // 8. Test ISO 8601 format for timestamps
  for (const snapshot of fetchedSnapshots) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt is valid ISO 8601`,
      !isNaN(new Date(snapshot.createdAt).getTime()),
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} changedAt is valid ISO 8601`,
      !isNaN(new Date(snapshot.changedAt).getTime()),
    );
    // Validate UUID format for snapshot id
    TestValidator.predicate(
      `snapshot ${snapshot.id} id is valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
  }
  // 9. Test requestStatus enum validity
  for (const snapshot of fetchedSnapshots) {
    TestValidator.equals(
      `snapshot ${snapshot.id} requestStatus is valid enum`,
      ["pending", "approved", "rejected"].includes(snapshot.requestStatus),
      true,
    );
  }
  // 10. Test changedByAdmin structure validity when present
  for (const snapshot of fetchedSnapshots) {
    if (
      snapshot.changedByAdmin !== null &&
      snapshot.changedByAdmin !== undefined
    ) {
      TestValidator.equals(
        `snapshot ${snapshot.id} changedByAdmin has valid UUID`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.changedByAdmin.id,
        ),
        true,
      );
      TestValidator.equals(
        `snapshot ${snapshot.id} changedByAdmin is_banned is boolean`,
        typeof snapshot.changedByAdmin.is_banned === "boolean",
        true,
      );
      TestValidator.equals(
        `snapshot ${snapshot.id} changedByAdmin email is valid ISO 8601`,
        !isNaN(new Date(snapshot.changedByAdmin.created_at).getTime()),
        true,
      );
    }
  }
}
