import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const parentRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.snapshots.at(
      administratorConnection,
      {
        administratorApprovalRequestId: parentRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "administrator approval request id should match the requested parent",
    snapshot.administratorApprovalRequestId,
    parentRequestId,
  );
  TestValidator.equals(
    "snapshot id should match the requested snapshot",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "nested parent request summary should reference the same request",
    snapshot.administratorApprovalRequest.id,
    parentRequestId,
  );
  const repeatedSnapshot =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.snapshots.at(
      administratorConnection,
      {
        administratorApprovalRequestId: parentRequestId,
        snapshotId,
      },
    );
  typia.assert(repeatedSnapshot);
  TestValidator.equals(
    "snapshot should be immutable across repeated reads",
    repeatedSnapshot,
    snapshot,
  );
}
