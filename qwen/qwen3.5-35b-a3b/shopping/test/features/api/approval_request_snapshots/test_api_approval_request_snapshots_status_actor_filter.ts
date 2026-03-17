import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_approval_request_snapshots_status_actor_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test snapshot filtering by status transition and actor type
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotData =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: {
          from_status: "pending",
          to_status: "rejected",
          actor_type: "admin",
        } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest,
      },
    );
  typia.assert(snapshotData);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination",
    snapshotData.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(snapshotData.data));
  // 4. Validate filter criteria in returned snapshots
  const filtersApplied = {
    from_status: "pending",
    to_status: "rejected",
    actor_type: "admin",
  };
  snapshotData.data.forEach((snapshot, index) => {
    typia.assert(snapshot);
    // Validate enum values for status fields
    const validFromStatus = ["pending", "approved", "rejected"];
    const validToStatus = ["pending", "approved", "rejected"];
    const validActorType = ["admin", "superAdmin"];
    TestValidator.equals(
      `snapshot ${index} from_status is valid enum`,
      validFromStatus.includes(snapshot.from_status),
      true,
    );
    TestValidator.equals(
      `snapshot ${index} to_status is valid enum`,
      validToStatus.includes(snapshot.to_status),
      true,
    );
    TestValidator.equals(
      `snapshot ${index} actor_type is valid enum`,
      validActorType.includes(snapshot.actor_type),
      true,
    );
    // Validate actor_id format when present
    if (snapshot.actor_id !== null) {
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      TestValidator.equals(
        `snapshot ${index} actor_id is valid uuid`,
        uuidPattern.test(snapshot.actor_id),
        true,
      );
    }
    // Validate timestamp format
    TestValidator.predicate(
      `snapshot ${index} created_at is valid date-time`,
      !isNaN(new Date(snapshot.created_at).getTime()),
    );
  });
}
