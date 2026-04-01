import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const administratorApprovalRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  const request: IMallPlatformAdministratorApprovalRequestSnapshot.IRequest = {
    page: 1,
    limit: 1,
  };
  const first =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.snapshots.index(
      administratorConnection,
      {
        administratorApprovalRequestId,
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.snapshots.index(
      administratorConnection,
      {
        administratorApprovalRequestId,
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "snapshot history should be stable for repeated reads",
    first,
    second,
  );
  TestValidator.equals(
    "requested page should be reflected in pagination",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested page size should be reflected in pagination",
    first.pagination.limit,
    request.limit,
  );
  for (const snapshot of first.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.administratorApprovalRequest);
  }
}
