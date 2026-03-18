import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
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
import { generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload } from "../../../generate/generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload";
import { prepare_random_shopping_mall_snapshot_payload } from "../../../prepare/prepare_random_shopping_mall_snapshot_payload";

export async function test_api_snapshot_payload_update_member_forbidden_not_party(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register Member A and Member B accounts (member join)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  // 2) Obtain a snapshot visible to Member A.
  // Since the SDK exposes the snapshots PATCH route as a browsing/index operation,
  // we browse for the latest snapshot created_by_member_id = memberA.id.
  const sourceEntityId = typia.random<string & tags.Format<"uuid">>();
  const snapshotSearch = {
    sourceType: "snapshot_test",
    sourceEntityId,
    createdByMemberId: memberA.id,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "created_at",
  } satisfies IShoppingMallSnapshot.IRequest;
  const snapshotPage = await api.functional.shoppingMall.member.snapshots.index(
    memberAConnection,
    {
      body: snapshotSearch,
    },
  );
  typia.assert(snapshotPage);
  const snapshotSummary = snapshotPage.data[0];
  if (!snapshotSummary) {
    throw new Error("No snapshot found for Member A");
  }
  const snapshotId = snapshotSummary.id;
  // 3) As an admin, create/initialize snapshot payload content for that snapshot.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const seededPayloadText = RandomGenerator.paragraph({ sentences: 2 });
  const seededPayload =
    await generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
      adminConnection,
      {
        params: { snapshotId },
        body: {
          payload: seededPayloadText,
        } satisfies IShoppingMallSnapshotPayload.ICreate,
      },
    );
  typia.assert(seededPayload);
  const snapshotPayloadId = seededPayload.id;
  // 4) Configure snapshot visibility parties: Member A can view, Member B cannot.
  // We set partyType discriminator to "member".
  await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
    memberAConnection,
    {
      snapshotId,
      body: {
        partyType: "member",
        partyId: memberA.id,
        canView: true,
      } satisfies IShoppingMallSnapshotParty.IUpdate,
    },
  );
  await api.functional.shoppingMall.member.snapshots.parties.updateSnapshotParties(
    memberAConnection,
    {
      snapshotId,
      body: {
        partyType: "member",
        partyId: memberB.id,
        canView: false,
      } satisfies IShoppingMallSnapshotParty.IUpdate,
    },
  );
  // 5) As Member B, attempt unauthorized payload update.
  const forbiddenPayloadText = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.httpError(
    "member B cannot update snapshot payload when not a permitted party",
    [400, 401, 403],
    async () => {
      await api.functional.shoppingMall.member.snapshots.payloads.updatePayloads(
        memberBConnection,
        {
          snapshotId,
          body: {
            payload: forbiddenPayloadText,
          } satisfies IShoppingMallSnapshotPayload.IUpdate,
        },
      );
    },
  );
  // 6) Confirm payload remains readable for Member A.
  // NOTE: SDK type for GET at(...) is void, so we can only validate no access error.
  await api.functional.shoppingMall.member.snapshots.payloads.at(
    memberAConnection,
    {
      snapshotId,
      snapshotPayloadId,
    },
  );
}
