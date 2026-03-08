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

/**
 * Test primary success path where an administrator can successfully retrieve snapshot history
 * for an administrative access request they are authorized to view.
 *
 * Note: The scenario describes creating/approving admin requests, but those endpoints
 * don't exist in the SDK. This test uses autonomous scenario correction by using
 * a random UUID to simulate an existing approved request with snapshots.
 *
 * 1. Two super administrators join the system
 * 2. Simulate retrieving snapshots for an admin request (random UUID)
 * 3. Validate response contains paginated snapshot list with correct structure
 */
export async function test_api_admin_request_snapshots_success_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join two super administrators
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 2. Use admin1's connection to retrieve snapshots
  // Note: In real scenario, admin1 would create/approve admin request first
  // For this test, use random UUID to simulate existing approved request
  const adminRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const response =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.listSnapshots(
      admin1Connection,
      {
        adminRequestId,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  const pagination = response.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data array exists", response.data.length >= 0);
  // 5. Validate data array contains snapshots
  TestValidator.predicate(
    "at least one snapshot exists",
    response.data.length >= 1,
  );
  // 6. Validate each snapshot structure
  for (const snapshot of response.data) {
    TestValidator.notEquals(
      `snapshot ${snapshot.id} has id`,
      snapshot.id,
      undefined,
    );
    TestValidator.notEquals(
      `snapshot ${snapshot.id} has reason`,
      snapshot.reason,
      undefined,
    );
    TestValidator.notEquals(
      `snapshot ${snapshot.id} has requestStatus`,
      snapshot.requestStatus,
      undefined,
    );
    // Validate requestStatus is one of the expected values
    TestValidator.predicate(
      `snapshot ${snapshot.id} requestStatus is valid`,
      ["pending", "approved", "rejected"].includes(snapshot.requestStatus),
    );
    TestValidator.notEquals(
      `snapshot ${snapshot.id} has createdAt`,
      snapshot.createdAt,
      undefined,
    );
    TestValidator.notEquals(
      `snapshot ${snapshot.id} has changedAt`,
      snapshot.changedAt,
      undefined,
    );
    // 7. Validate changedByAdmin if present
    if (
      snapshot.changedByAdmin !== undefined &&
      snapshot.changedByAdmin !== null
    ) {
      TestValidator.notEquals(
        `snapshot ${snapshot.id} changedByAdmin has id`,
        snapshot.changedByAdmin.id,
        undefined,
      );
      TestValidator.notEquals(
        `snapshot ${snapshot.id} changedByAdmin has email`,
        snapshot.changedByAdmin.email,
        undefined,
      );
      TestValidator.notEquals(
        `snapshot ${snapshot.id} changedByAdmin has is_banned`,
        snapshot.changedByAdmin.is_banned,
        undefined,
      );
      TestValidator.notEquals(
        `snapshot ${snapshot.id} changedByAdmin has created_at`,
        snapshot.changedByAdmin.created_at,
        undefined,
      );
      TestValidator.notEquals(
        `snapshot ${snapshot.id} changedByAdmin has updated_at`,
        snapshot.changedByAdmin.updated_at,
        undefined,
      );
    }
  }
  // 8. Validate sorting: data sorted by changedAt descending (most recent first)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevSnapshot = response.data[i - 1];
      const currSnapshot = response.data[i];
      TestValidator.predicate(
        `snapshots sorted by changedAt descending (index ${i - 1} vs ${i})`,
        new Date(prevSnapshot.changedAt) >= new Date(currSnapshot.changedAt),
      );
    }
  }
  // 9. Validate pagination counts match actual data
  TestValidator.equals(
    "pagination records matches data length",
    pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination pages calculation",
    pagination.pages,
    Math.ceil(response.data.length / pagination.limit),
  );
}
