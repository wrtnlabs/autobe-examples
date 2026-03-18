import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_admin_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_snapshots_create";
import { generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party } from "../../../generate/generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";
import { prepare_random_shopping_mall_snapshot_party } from "../../../prepare/prepare_random_shopping_mall_snapshot_party";

export async function test_api_snapshot_parties_grant_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin (join first to ensure existence)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  };
  await authorize_admin_join(adminConnection, adminCreds);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCreds.body.email,
      password: adminCreds.body.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Create a snapshot
  const snapshot: IShoppingMallSnapshot =
    await generate_random_shopping_mall_admin_snapshots_create(
      adminConnection,
      {},
    );
  typia.assert(snapshot);
  // 3) Create a member identity to grant access
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 4) Grant snapshot view permission (canView=true)
  const partyType = "member";
  const requestBody: IShoppingMallSnapshotParty.ICreate = {
    partyType: partyType,
    partyId: member.id,
    canView: true,
  };
  const createdParty =
    await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
      adminConnection,
      {
        params: {
          snapshotId: snapshot.id,
        },
        body: requestBody,
      },
    );
  typia.assert(createdParty);
  // 5) Validate response fields
  TestValidator.equals(
    "shopping_mall_snapshot_id matches",
    createdParty.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals(
    "party_type matches",
    createdParty.party_type,
    requestBody.partyType,
  );
  TestValidator.equals(
    "party_id matches",
    createdParty.party_id,
    requestBody.partyId,
  );
  TestValidator.equals("can_view is true", createdParty.can_view, true);
  TestValidator.equals("deleted_at is null", createdParty.deleted_at, null);
  // created_at/updated_at presence (typia.assert already validated date-time)
  TestValidator.predicate(
    "created_at present",
    createdParty.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    createdParty.updated_at.length > 0,
  );
  // 6) Business-rule consistency: association is active and correctly linked
  TestValidator.equals(
    "active association linked to snapshot",
    createdParty.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals(
    "active association linked to party",
    createdParty.party_id,
    member.id,
  );
}
