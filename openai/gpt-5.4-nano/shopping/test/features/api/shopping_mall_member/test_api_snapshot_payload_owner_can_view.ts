import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshot_payload_owner_can_view(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member (owner actor)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers ??= {};
  ownerConnection.headers.Authorization = authorized.token.access;
  // 2) Use random snapshot identifiers (no snapshot discovery APIs provided)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotPayloadId = typia.random<string & tags.Format<"uuid">>();
  // 3) Call snapshot payload endpoint
  if (connection.simulate) {
    await api.functional.shoppingMall.member.snapshots.payloads.at(
      ownerConnection,
      {
        snapshotId,
        snapshotPayloadId,
      },
    );
    return;
  }
  await TestValidator.httpError(
    "owner member can view snapshot payload (non-simulate should deny when snapshot/payload not found)",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.member.snapshots.payloads.at(
        ownerConnection,
        {
          snapshotId,
          snapshotPayloadId,
        },
      );
    },
  );
}
