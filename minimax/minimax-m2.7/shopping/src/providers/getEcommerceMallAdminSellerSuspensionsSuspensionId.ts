import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function getEcommerceMallAdminSellerSuspensionsSuspensionId(props: {
  admin: AdminPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerSuspension> {
  const suspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: props.suspensionId },
      ...EcommerceMallSellerSuspensionTransformer.select(),
    });
  return await EcommerceMallSellerSuspensionTransformer.transform(suspension);
}
