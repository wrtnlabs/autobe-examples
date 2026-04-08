import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSellerTransformer } from "../transformers/EcommerceSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellersSellerId(props: {
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSeller> {
  const record = await MyGlobal.prisma.ecommerce_sellers.findFirstOrThrow({
    ...EcommerceSellerTransformer.select(),
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  return await EcommerceSellerTransformer.transform(record);
}
