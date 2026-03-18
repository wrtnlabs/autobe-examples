import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
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
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_snapshot_view_payload_present_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuthorized);
  // 2) Create an address
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {},
  );
  typia.assert(address);
  // 3) Create an immutable address snapshot
  const snapshot =
    await api.functional.shoppingMall.member.addresses.snapshots.createAddressSnapshot(
      memberConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(snapshot);
  // 4) Fetch snapshot (payload expected to be present)
  const fetched1 = await api.functional.shoppingMall.member.snapshots.at(
    memberConnection,
    {
      snapshotId: snapshot.id,
    },
  );
  typia.assert(fetched1);
  TestValidator.equals("snapshot id matches", fetched1.id, snapshot.id);
  TestValidator.predicate("payload is present", fetched1.payload !== null);
  // 5) Validate important metadata
  TestValidator.predicate(
    "snapshotCode is non-empty",
    fetched1.snapshotCode.length > 0,
  );
  TestValidator.predicate(
    "sourceType is non-empty",
    fetched1.sourceType.length > 0,
  );
  TestValidator.predicate("reason is non-empty", fetched1.reason.length > 0);
  TestValidator.predicate(
    "createdAt is non-empty",
    fetched1.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is non-empty",
    fetched1.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is either null or a date-time string",
    fetched1.deletedAt !== null ? fetched1.deletedAt.length > 0 : true,
  );
  // 6) Verify read-only behavior across multiple reads
  const fetched2 = await api.functional.shoppingMall.member.snapshots.at(
    memberConnection,
    {
      snapshotId: snapshot.id,
    },
  );
  typia.assert(fetched2);
  TestValidator.equals("id stable", fetched2.id, fetched1.id);
  TestValidator.equals(
    "sourceEntityId stable",
    fetched2.sourceEntityId,
    fetched1.sourceEntityId,
  );
  TestValidator.equals(
    "snapshotCode stable",
    fetched2.snapshotCode,
    fetched1.snapshotCode,
  );
  TestValidator.equals(
    "sourceType stable",
    fetched2.sourceType,
    fetched1.sourceType,
  );
  TestValidator.equals("reason stable", fetched2.reason, fetched1.reason);
  TestValidator.equals(
    "createdAt stable",
    fetched2.createdAt,
    fetched1.createdAt,
  );
  TestValidator.equals(
    "updatedAt stable",
    fetched2.updatedAt,
    fetched1.updatedAt,
  );
  TestValidator.equals(
    "deletedAt stable",
    fetched2.deletedAt,
    fetched1.deletedAt,
  );
  TestValidator.equals(
    "sourceSellerId stable",
    fetched2.sourceSellerId,
    fetched1.sourceSellerId,
  );
  TestValidator.equals(
    "sourceOrderId stable",
    fetched2.sourceOrderId,
    fetched1.sourceOrderId,
  );
  TestValidator.equals(
    "sourceOrderItemId stable",
    fetched2.sourceOrderItemId,
    fetched1.sourceOrderItemId,
  );
  TestValidator.equals(
    "sourceReviewId stable",
    fetched2.sourceReviewId,
    fetched1.sourceReviewId,
  );
  TestValidator.equals(
    "sourceCancellationRequestId stable",
    fetched2.sourceCancellationRequestId,
    fetched1.sourceCancellationRequestId,
  );
  TestValidator.equals(
    "sourceRefundRequestId stable",
    fetched2.sourceRefundRequestId,
    fetched1.sourceRefundRequestId,
  );
  TestValidator.equals(
    "createdByMemberId stable",
    fetched2.createdByMemberId,
    fetched1.createdByMemberId,
  );
  TestValidator.predicate(
    "payload is present on second fetch",
    fetched2.payload !== null,
  );
  TestValidator.equals(
    "payload id stable",
    fetched2.payload === null ? null : fetched2.payload.id,
    fetched1.payload === null ? null : fetched1.payload.id,
  );
  TestValidator.equals(
    "payload shopping_mall_snapshot_id stable",
    fetched2.payload === null
      ? null
      : fetched2.payload.shopping_mall_snapshot_id,
    fetched1.payload === null
      ? null
      : fetched1.payload.shopping_mall_snapshot_id,
  );
  TestValidator.equals(
    "payload payload stable",
    fetched2.payload === null ? null : fetched2.payload.payload,
    fetched1.payload === null ? null : fetched1.payload.payload,
  );
  TestValidator.equals(
    "payload created_at stable",
    fetched2.payload === null ? null : fetched2.payload.created_at,
    fetched1.payload === null ? null : fetched1.payload.created_at,
  );
  TestValidator.equals(
    "payload updated_at stable",
    fetched2.payload === null ? null : fetched2.payload.updated_at,
    fetched1.payload === null ? null : fetched1.payload.updated_at,
  );
  TestValidator.equals(
    "payload deleted_at stable",
    fetched2.payload === null ? null : fetched2.payload.deleted_at,
    fetched1.payload === null ? null : fetched1.payload.deleted_at,
  );
}
