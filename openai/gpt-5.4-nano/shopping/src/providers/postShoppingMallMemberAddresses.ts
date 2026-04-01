import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAddressCollector } from "../collectors/ShoppingMallAddressCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallAddressTransformer } from "../transformers/ShoppingMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberAddresses(props: {
  member: MemberPayload;
  body: IShoppingMallAddress.ICreate;
}): Promise<IShoppingMallAddress> {
  const isDefault: boolean = props.body.is_default ?? false;
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdAddress = await tx.shopping_mall_addresses.create({
      data: await ShoppingMallAddressCollector.collect({
        body: props.body,
        shoppingMallMembers: props.member,
      }),
    });
    if (isDefault) {
      await tx.shopping_mall_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.member.id,
          deleted_at: null,
          is_default: true,
          id: { not: createdAddress.id },
        },
        data: { is_default: false, updated_at: new Date() },
      });
    }
    const withSelect = await tx.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: createdAddress.id },
      ...ShoppingMallAddressTransformer.select(),
    });
    return withSelect;
  });
  return await ShoppingMallAddressTransformer.transform(created);
}
