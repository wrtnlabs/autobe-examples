import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCancellationRequestSnapshotTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberPostPurchaseCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          cancellation_request_id: props.cancellationRequestId,
        },
        ...ShoppingMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  const cancellationRequest = snapshot.cancellationRequest;
  const isCustomer = cancellationRequest.customer.id === props.member.id;
  const isSeller = cancellationRequest.orderItem.seller.id === props.member.id;
  if (!isCustomer && !isSeller) {
    const admin = await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: {
        shopping_mall_member_id: props.member.id,
        deleted_at: null,
      },
    });
    if (!admin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await ShoppingMallCancellationRequestSnapshotTransformer.transform(
    snapshot,
  );
}
