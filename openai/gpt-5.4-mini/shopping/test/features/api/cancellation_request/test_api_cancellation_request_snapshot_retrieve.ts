import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Retrieve an immutable cancellation request snapshot for an administrator.
 *
 * Verifies that an authenticated administrator can load a single snapshot from
 * the order item → cancellation request → snapshot hierarchy without mutation.
 * The test focuses on audit-read behavior, ensuring the snapshot remains stable
 * across repeated retrievals and that the preserved historical record is tied to
 * the requested snapshot id.
 *
 * 1. Authenticate an administrator using an isolated actor-specific connection.
 * 2. Retrieve a cancellation request snapshot by its full hierarchy identifiers.
 * 3. Validate the returned snapshot and confirm repeated retrieval yields the same immutable record.
 */
export async function test_api_cancellation_request_snapshot_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const props = {
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
    snapshotId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies {
    orderItemId: string & tags.Format<"uuid">;
    cancellationRequestId: string & tags.Format<"uuid">;
    snapshotId: string & tags.Format<"uuid">;
  };
  const snapshot =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.at(
      adminConnection,
      props,
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id matches request",
    snapshot.id,
    props.snapshotId,
  );
  TestValidator.predicate(
    "parent cancellation request summary exists",
    snapshot.cancellationRequest !== null &&
      snapshot.cancellationRequest !== undefined,
  );
  const repeated =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.at(
      adminConnection,
      props,
    );
  typia.assert(repeated);
  TestValidator.equals("snapshot id is stable", repeated.id, snapshot.id);
  TestValidator.equals(
    "parent cancellation request summary is stable",
    repeated.cancellationRequest,
    snapshot.cancellationRequest,
  );
  TestValidator.equals(
    "snapshot status is stable",
    repeated.snapshotStatus,
    snapshot.snapshotStatus,
  );
  TestValidator.equals(
    "review result is stable",
    repeated.reviewResult,
    snapshot.reviewResult,
  );
  TestValidator.equals("reason is stable", repeated.reason, snapshot.reason);
  TestValidator.equals(
    "changedAt is stable",
    repeated.changedAt,
    snapshot.changedAt,
  );
  TestValidator.equals(
    "createdAt is stable",
    repeated.createdAt,
    snapshot.createdAt,
  );
  TestValidator.equals(
    "updatedAt is stable",
    repeated.updatedAt,
    snapshot.updatedAt,
  );
  TestValidator.equals(
    "deletedAt is stable",
    repeated.deletedAt,
    snapshot.deletedAt,
  );
}
