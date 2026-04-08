import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCustomerProfileTransformer } from "../transformers/ShoppingMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberProfile(props: {
  member: MemberPayload;
  body: IShoppingMallCustomerProfile.IUpdate;
}): Promise<IShoppingMallCustomerProfile> {
  await MyGlobal.prisma.shopping_mall_customer_profiles.update({
    where: { shopping_mall_member_id: props.member.id },
    data: {
      ...(props.body.displayName !== undefined && {
        display_name: props.body.displayName,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findUniqueOrThrow({
      where: { shopping_mall_member_id: props.member.id },
      ...ShoppingMallCustomerProfileTransformer.select(),
    });
  return await ShoppingMallCustomerProfileTransformer.transform(updated);
}
