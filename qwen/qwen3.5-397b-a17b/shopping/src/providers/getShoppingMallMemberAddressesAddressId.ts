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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberAddressesAddressId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerAddress> {
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
        customerProfile: {
          shopping_mall_member_id: props.member.id,
        },
      },
      ...ShoppingMallCustomerAddressTransformer.select(),
    });
  return await ShoppingMallCustomerAddressTransformer.transform(address);
}
