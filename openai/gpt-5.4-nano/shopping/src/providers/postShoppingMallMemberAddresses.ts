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
  const address = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.shopping_mall_addresses.create({
      data: await ShoppingMallAddressCollector.collect({
        body: props.body,
        shoppingMallMembers: props.member,
      }),
    });
    if (props.body.is_default === true) {
      await tx.shopping_mall_addresses.updateMany({
        where: {
          shopping_mall_customer_id: props.member.id,
          id: { not: created.id },
          deleted_at: null,
        },
        data: { is_default: false },
      });
    }
    const fetched = await tx.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallAddressTransformer.select(),
    });
    return await ShoppingMallAddressTransformer.transform(fetched);
  });
  return address;
}
