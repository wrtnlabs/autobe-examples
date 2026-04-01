import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_parent_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.administrator.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "snapshot lookup should fail when snapshot does not belong to the cancellation request",
    async () => {
      try {
        await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.at(
          adminConnection,
          {
            orderItemId,
            cancellationRequestId,
            snapshotId: mismatchedSnapshotId,
          },
        );
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          (error as { status?: unknown }).status === 404
        ) {
          TestValidator.predicate(
            "snapshot mismatch should be treated as not found",
            (error as { status?: unknown }).status === 404,
          );
          return;
        }
        throw error;
      }
      throw new Error("Expected not-found error");
    },
  );
  await TestValidator.error(
    "snapshot lookup should fail when cancellation request does not belong to the order item",
    async () => {
      try {
        await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.at(
          adminConnection,
          {
            orderItemId,
            cancellationRequestId: mismatchedCancellationRequestId,
            snapshotId,
          },
        );
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          (error as { status?: unknown }).status === 404
        ) {
          TestValidator.predicate(
            "parent mismatch should be treated as not found",
            (error as { status?: unknown }).status === 404,
          );
          return;
        }
        throw error;
      }
      throw new Error("Expected not-found error");
    },
  );
}
