import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallUserBanTransformer } from "../transformers/EcommerceMallUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminUserBansUserBanId(props: {
  admin: AdminPayload;
  userBanId: string & tags.Format<"uuid">;
  body: IEcommerceMallUserBan.IUpdate;
}): Promise<IEcommerceMallUserBan> {
  const ban = await MyGlobal.prisma.ecommerce_mall_user_bans.findUniqueOrThrow({
    where: { id: props.userBanId },
  });
  const updated = await MyGlobal.prisma.ecommerce_mall_user_bans.update({
    where: { id: props.userBanId },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      ...(props.body.unban_at !== undefined && {
        unban_at: props.body.unban_at,
      }),
      updated_at: new Date().toISOString(),
    },
    ...EcommerceMallUserBanTransformer.select(),
  });
  return await EcommerceMallUserBanTransformer.transform(updated);
}
