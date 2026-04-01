import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallAddressAtSummaryTransformer } from "../transformers/ShoppingMallAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberAddressesDefault(props: {
  member: MemberPayload;
  body: IShoppingMallAddress.ISetDefault;
}): Promise<IShoppingMallAddress.ISummary> {
  // 1) Ensure the target address exists, belongs to the current member, and is active.
  const target = await MyGlobal.prisma.shopping_mall_addresses.findFirstOrThrow(
    {
      where: {
        id: props.body.id,
        shopping_mall_customer_id: props.member.id,
        deleted_at: null,
      },
      ...ShoppingMallAddressAtSummaryTransformer.select(),
    },
  );
  // 2) No-address edge case: if the customer has zero active addresses, reject.
  const activeCount = await MyGlobal.prisma.shopping_mall_addresses.count({
    where: {
      shopping_mall_customer_id: props.member.id,
      deleted_at: null,
    },
  });
  if (activeCount === 0) {
    throw new HttpException("No addresses available", 400);
  }
  // 3) Single-default enforcement in a transaction.
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.member.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
    const updated = await tx.shopping_mall_addresses.updateMany({
      where: {
        id: props.body.id,
        shopping_mall_customer_id: props.member.id,
        deleted_at: null,
      },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    });
    if (updated.count !== 1) {
      // Address became ineligible between the initial read and mutation.
      throw new HttpException("Address is not eligible", 400);
    }
  });
  const refreshed =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.body.id },
      ...ShoppingMallAddressAtSummaryTransformer.select(),
    });
  return await ShoppingMallAddressAtSummaryTransformer.transform(refreshed);
}
