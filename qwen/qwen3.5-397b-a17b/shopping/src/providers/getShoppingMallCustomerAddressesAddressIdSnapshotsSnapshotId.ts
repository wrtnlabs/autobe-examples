import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAddressSnapshotTransformer } from "../transformers/ShoppingMallAddressSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerAddressesAddressIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAddressSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_address_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_address_id: true,
        recipient_name: true,
        recipient_phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        address: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  if (snapshot.shopping_mall_address_id !== props.addressId) {
    throw new HttpException(
      "Snapshot does not belong to the specified address",
      404,
    );
  }
  if (snapshot.address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - Address does not belong to customer",
      403,
    );
  }
  const snapshotWithFullData =
    await MyGlobal.prisma.shopping_mall_address_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...ShoppingMallAddressSnapshotTransformer.select(),
    });
  return await ShoppingMallAddressSnapshotTransformer.transform(
    snapshotWithFullData,
  );
}
