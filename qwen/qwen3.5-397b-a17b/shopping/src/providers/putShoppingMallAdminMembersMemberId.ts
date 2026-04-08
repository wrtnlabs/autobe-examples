import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallMemberTransformer } from "../transformers/ShoppingMallMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  body: IShoppingMallMember.IUpdate;
}): Promise<IShoppingMallMember> {
  await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
    where: { id: props.memberId },
  });
  await MyGlobal.prisma.shopping_mall_members.update({
    where: { id: props.memberId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow(
    {
      where: { id: props.memberId },
      ...ShoppingMallMemberTransformer.select(),
    },
  );
  return await ShoppingMallMemberTransformer.transform(updated);
}
