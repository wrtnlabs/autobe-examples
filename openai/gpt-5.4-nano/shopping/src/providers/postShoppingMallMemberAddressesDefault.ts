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
  const activeCount = await MyGlobal.prisma.shopping_mall_addresses.count({
    where: { shopping_mall_customer_id: props.member.id, deleted_at: null },
  });
  if (activeCount <= 0) {
    throw new HttpException("No available shipping addresses", 400);
  }
  const target =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.body.id },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        deleted_at: true,
        is_default: true,
      },
    });
  if (
    target.shopping_mall_customer_id !== props.member.id ||
    target.deleted_at !== null
  ) {
    throw new HttpException("Address not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.member.id,
        is_default: true,
        deleted_at: null,
      },
      data: { is_default: false, updated_at: new Date() },
    });
    await tx.shopping_mall_addresses.update({
      where: { id: props.body.id },
      data: { is_default: true, updated_at: new Date() },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: props.body.id },
      ...ShoppingMallAddressAtSummaryTransformer.select(),
    });
  return await ShoppingMallAddressAtSummaryTransformer.transform(updated);
}
