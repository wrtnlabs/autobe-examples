import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_variant_snapshot_retrieval_admin_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // Helper to fetch snapshot (admin/member authorized)
  const fetchSnapshot = async (
    snapshotId: string & tags.Format<"uuid">,
    actor: api.IConnection,
  ): Promise<IShoppingMallProductVariantSnapshot> => {
    const output =
      await api.functional.shoppingMall.admin.productVariantSnapshots.at(
        actor,
        {
          productVariantSnapshotId: snapshotId,
        },
      );
    typia.assert(output);
    return output;
  };
  // Find an existing snapshot id by bounded retry
  let existingSnapshot: IShoppingMallProductVariantSnapshot | undefined;
  let existingId: (string & tags.Format<"uuid">) | undefined;
  const attempts = 8;
  for (const _ of ArrayUtil.repeat(attempts, () => 0)) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    try {
      const snap = await fetchSnapshot(candidateId, adminConnection);
      existingSnapshot = snap;
      existingId = candidateId;
      break;
    } catch {
      continue;
    }
  }
  if (!existingSnapshot || !existingId) {
    throw new Error(
      "Failed to discover an existing productVariantSnapshotId for admin retrieval test.",
    );
  }
  // Scenario 1: admin success
  const snapshot = await fetchSnapshot(existingId, adminConnection);
  typia.assert(snapshot);
  TestValidator.equals("snapshot.id matches", snapshot.id, existingSnapshot.id);
  TestValidator.equals(
    "shopping_mall_product_variant_id matches",
    snapshot.shopping_mall_product_variant_id,
    existingSnapshot.shopping_mall_product_variant_id,
  );
  TestValidator.predicate(
    "deleted_at is null or date-time",
    snapshot.deleted_at === null ||
      (typeof snapshot.deleted_at === "string" &&
        !Number.isNaN(Date.parse(snapshot.deleted_at))),
  );
  // Scenario 2: admin not found
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "admin should get not-found for non-existent snapshot",
    404,
    async () => {
      await api.functional.shoppingMall.admin.productVariantSnapshots.at(
        adminConnection,
        {
          productVariantSnapshotId: nonExistentId,
        },
      );
    },
  );
  // Scenario 3: member forbidden
  await TestValidator.httpError(
    "member should be forbidden from admin snapshot retrieval",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.productVariantSnapshots.at(
        memberConnection,
        {
          productVariantSnapshotId: existingId,
        },
      );
    },
  );
}
