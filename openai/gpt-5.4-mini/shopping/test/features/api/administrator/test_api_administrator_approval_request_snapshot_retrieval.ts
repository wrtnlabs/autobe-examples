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
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const snapshot =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.getByAdministratorapprovalrequestidAndAdministratorapprovalrequestsnapshotid(
      administratorConnection,
      {
        administratorApprovalRequestId: typia.random<
          string & tags.Format<"uuid">
        >(),
        administratorApprovalRequestSnapshotId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot parent request reference matches embedded parent summary",
    snapshot.administratorApprovalRequestId,
    snapshot.administratorApprovalRequest.id,
  );
  TestValidator.predicate(
    "snapshot reason is preserved as a non-empty audit value",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot creation timestamp is present",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "embedded parent request summary is readable",
    snapshot.administratorApprovalRequest.reason.length > 0,
  );
}
