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

export async function getShoppingMallMemberProfile(props: {
  member: MemberPayload;
}): Promise<IShoppingMallCustomerProfile> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findFirstOrThrow({
      where: {
        shopping_mall_member_id: props.member.id,
        deleted_at: null,
      },
      ...ShoppingMallCustomerProfileTransformer.select(),
    });
  return await ShoppingMallCustomerProfileTransformer.transform(record);
}
