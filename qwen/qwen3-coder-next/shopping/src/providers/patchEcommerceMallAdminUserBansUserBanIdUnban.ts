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

export async function patchEcommerceMallAdminUserBansUserBanIdUnban(props: {
  admin: AdminPayload;
  userBanId: string;
}): Promise<IEcommerceMallUserBan> {
  const updated = await MyGlobal.prisma.ecommerce_mall_user_bans.update({
    where: { id: props.userBanId },
    data: {
      is_active: false,
      unban_at: new Date(),
      updated_at: new Date(),
    },
    ...EcommerceMallUserBanTransformer.select(),
  });
  return await EcommerceMallUserBanTransformer.transform(updated);
}
