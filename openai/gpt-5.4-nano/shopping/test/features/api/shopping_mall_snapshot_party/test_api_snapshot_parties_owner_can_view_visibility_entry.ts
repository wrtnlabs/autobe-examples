import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshot_parties_owner_can_view_visibility_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  // 2) Browse member snapshots and pick one snapshot id
  const page: IPageIShoppingMallSnapshot.ISummary =
    await api.functional.shoppingMall.member.snapshots.index(memberConnection, {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        createdByMemberId: member.id,
      } satisfies IShoppingMallSnapshot.IRequest,
    });
  typia.assert(page);
  const snapshot = page.data[0];
  const snapshotId = snapshot.id;
  // 3) Update snapshot parties for the selected snapshot so that can_view=true
  // Note: the endpoint returns the updated snapshot-party summary (single).
  const updatedParty: IShoppingMallSnapshotParty.ISummary =
    await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
      memberConnection,
      {
        snapshotId,
        body: {
          partyType: typia.random<string>(),
          partyId: member.id,
          canView: true,
        } satisfies IShoppingMallSnapshotParty.IUpdate,
      },
    );
  typia.assert(updatedParty);
  const snapshotPartyId = updatedParty.id;
  // 4) Retrieve the specific visibility entry
  const entry: IShoppingMallSnapshotParty =
    await api.functional.shoppingMall.member.snapshots.parties.at(
      memberConnection,
      {
        snapshotId,
        snapshotPartyId,
      },
    );
  typia.assert(entry);
  // 5) Validate consistency and identity mapping
  TestValidator.equals(
    "shopping_mall_snapshot_id matches snapshotId",
    entry.shopping_mall_snapshot_id,
    snapshotId,
  );
  TestValidator.equals("id matches snapshotPartyId", entry.id, snapshotPartyId);
  TestValidator.equals("can_view is true", entry.can_view, true);
  TestValidator.equals(
    "deleted_at is null when can_view=true",
    entry.deleted_at,
    null,
  );
}
