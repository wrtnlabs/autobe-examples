import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshot_lookup_by_code_metadata_without_payload(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Best-effort: request combinations until we observe payload === null.
  // The request DTO available for this endpoint is IShoppingMallSnapshot.IRequest.
  let lastError: unknown = undefined;
  for (let attempt = 0; attempt < 12; attempt++) {
    const requestBody = typia.random<IShoppingMallSnapshot.IRequest>();
    try {
      const result =
        await api.functional.shoppingMall.member.snapshots.lookup_by_code.lookupByCode(
          memberConnection,
          {
            body: requestBody,
          },
        );
      typia.assert(result);
      if (result.payload === null) {
        TestValidator.predicate(
          "payload should be null when payload row is missing/soft-deleted",
          result.payload === null,
        );
        TestValidator.predicate(
          "metadata fields should still exist",
          result.reason.length > 0 &&
            result.createdAt.length > 0 &&
            result.updatedAt.length > 0,
        );
        return;
      }
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error(
    "Unable to locate a snapshot response with payload === null for the authenticated member",
  );
}
