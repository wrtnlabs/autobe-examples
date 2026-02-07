import { IEcommerceProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerProductsProductIdReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceProductReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceProductReviewSnapshot.ISummary> {
  const page = 1;
  const limit = 25;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_product_review_snapshotsWhereInput = {
    ecommerce_product_review_id: props.reviewId,
    deleted_at: null,
  };
  const data =
    await MyGlobal.prisma.ecommerce_product_review_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total = await MyGlobal.prisma.ecommerce_product_review_snapshots.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
