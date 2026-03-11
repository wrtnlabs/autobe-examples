import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminSellerSuspensionsSellerSuspensionId(props: {
  admin: AdminPayload;
  sellerSuspensionId: string;
  body: IEcommerceMallSellerSuspension.IUpdate;
}): Promise<IEcommerceMallSellerSuspension> {
  const now = new Date();
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.update({
      where: { id: props.sellerSuspensionId },
      data: {
        reason: props.body.reason ?? undefined,
        reinstated_at: props.body.reinstated_at ?? undefined,
        reinstated_by_id: props.body.reinstated_by_id ?? undefined,
        updated_at: now,
      },
      ...EcommerceMallSellerSuspensionTransformer.select(),
    });
  return await EcommerceMallSellerSuspensionTransformer.transform(updated);
}
