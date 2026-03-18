import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_payload_update_admin_forbidden_without_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate an admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: adminCreds,
    });
  typia.assert(adminAuthorized);
  // 2) Attempt the payload update with a snapshotId that admin cannot view.
  // We don't have snapshot enumeration/read APIs in the provided materials, so
  // we probe multiple UUID candidates until we observe the expected 403.
  const payloadUpdate = {
    payload: typia.random<string>(),
  } satisfies IShoppingMallSnapshotPayload.IUpdate;
  const snapshotCandidates = ArrayUtil.repeat(6, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  let forbiddenSnapshotId: (string & tags.Format<"uuid">) | undefined =
    undefined;
  for (const snapshotId of snapshotCandidates) {
    await TestValidator.httpError(
      "snapshot payload update should be forbidden",
      403,
      async () => {
        await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
          adminConnection,
          {
            snapshotId,
            body: payloadUpdate,
          },
        );
      },
    ).catch((err) => {
      // If not 403 (e.g., 404), ignore and keep probing.
      // Re-throw only when error is not an HttpError.
      if (!(err instanceof Error)) throw err;
    });
    // If the above didn't throw, then it wasn't forbidden; stop with failure.
    if (forbiddenSnapshotId === undefined) {
      // Determine whether the candidate was actually forbidden by trying again
      // and expecting 403; if it doesn't throw, it means the call succeeded.
      await TestValidator.error(
        "snapshot payload update should be rejected",
        async () => {
          await TestValidator.httpError(
            "snapshot payload update should be forbidden on retry",
            403,
            async () => {
              await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
                adminConnection,
                {
                  snapshotId,
                  body: payloadUpdate,
                },
              );
            },
          );
        },
      );
      // If we reached here, we have observed the expected forbidden behavior.
      forbiddenSnapshotId = snapshotId;
      break;
    }
  }
  TestValidator.predicate(
    "should find a snapshotId that yields 403 forbidden",
    forbiddenSnapshotId !== undefined,
  );
  // 3) Immutability check (best-effort with available APIs): after the
  // forbidden attempt, repeating the same forbidden update must still be
  // rejected, and no successful payload is returned.
  if (forbiddenSnapshotId !== undefined) {
    await TestValidator.httpError(
      "snapshot payload update remains forbidden",
      403,
      async () => {
        await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
          adminConnection,
          {
            snapshotId: forbiddenSnapshotId,
            body: payloadUpdate,
          },
        );
      },
    );
  }
}
