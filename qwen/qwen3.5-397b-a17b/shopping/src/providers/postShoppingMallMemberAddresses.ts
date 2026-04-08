import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCustomerAddressCollector } from "../collectors/ShoppingMallCustomerAddressCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberAddresses(props: {
  member: MemberPayload;
  body: IShoppingMallCustomerAddress.ICreate;
}): Promise<IShoppingMallCustomerAddress> {
  const customerProfile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findUniqueOrThrow({
      where: {
        shopping_mall_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.is_default === true) {
      await tx.shopping_mall_customer_addresses.updateMany({
        where: {
          shopping_mall_customer_profile_id: customerProfile.id,
          is_default: true,
          deleted_at: null,
        },
        data: {
          is_default: false,
          updated_at: new Date(),
        },
      });
    }
    return tx.shopping_mall_customer_addresses.create({
      data: await ShoppingMallCustomerAddressCollector.collect({
        body: props.body,
        shoppingMallCustomerProfiles: customerProfile,
      }),
      ...ShoppingMallCustomerAddressTransformer.select(),
    });
  });
  return await ShoppingMallCustomerAddressTransformer.transform(record);
}
