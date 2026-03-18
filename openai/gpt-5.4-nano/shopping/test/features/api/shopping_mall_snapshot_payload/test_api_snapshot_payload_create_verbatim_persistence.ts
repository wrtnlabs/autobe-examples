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
import { generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload } from "../../../generate/generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload";
import { prepare_random_shopping_mall_snapshot_payload } from "../../../prepare/prepare_random_shopping_mall_snapshot_payload";

export async function test_api_snapshot_payload_create_verbatim_persistence(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin join/auth
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const authorized: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: adminJoinPayload,
    },
  );
  typia.assert(authorized);
  // 2) Use a snapshotId (must be an existing snapshot that admin can view)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3) Submit a serialized payload string with distinct markers
  const verbatimPayload =
    "v1::" +
    RandomGenerator.alphabets(12) +
    "::" +
    RandomGenerator.alphabets(8);
  const response: IShoppingMallSnapshotPayload =
    await generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
      adminConnection,
      {
        params: {
          snapshotId,
        },
        body: {
          payload: verbatimPayload,
        },
      },
    );
  typia.assert(response);
  // 4) Validations
  TestValidator.equals(
    "snapshot payload stored verbatim",
    response.payload,
    verbatimPayload,
  );
  TestValidator.equals("deleted_at should be null", response.deleted_at, null);
  TestValidator.equals(
    "shopping_mall_snapshot_id should match snapshotId",
    response.shopping_mall_snapshot_id,
    snapshotId,
  );
}
