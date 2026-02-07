import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerSessionAtSummaryTransformer } from "../transformers/EcommerceSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerSellerSessions(props: {
  seller: SellerPayload;
  body: IEcommerceSellerSession.IRequest;
}): Promise<IPageIEcommerceSellerSession.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_seller_sessions.findMany({
    where: {
      ecommerce_seller_id: props.seller.id,
      expired_at: { gt: toISOStringSafe(new Date()) },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceSellerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_seller_sessions.count({
    where: {
      ecommerce_seller_id: props.seller.id,
      expired_at: { gt: toISOStringSafe(new Date()) },
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceSellerSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
