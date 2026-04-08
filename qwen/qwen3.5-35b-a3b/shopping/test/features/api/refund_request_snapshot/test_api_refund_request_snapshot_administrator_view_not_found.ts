import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_administrator_view_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a connection with admin token for API calls
  const adminApiConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Generate a known invalid UUID that definitely doesn't exist in the database
  const invalidSnapshotId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";
  // 4. Attempt to retrieve the non-existent refund request snapshot
  // The API should return HTTP 404 Not Found
  await TestValidator.error(
    "should return 404 for non-existent snapshot",
    async () => {
      await api.functional.ecommerceMall.administrator.refund_request_snapshots.at(
        adminApiConnection,
        {
          id: invalidSnapshotId,
        },
      );
    },
  );
}
