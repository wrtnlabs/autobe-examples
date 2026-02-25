import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceProductSnapshot> {
  // Verify product ownership
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { ecommerce_seller_id: true },
  });
  if (product.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Set pagination defaults (hardcoded as per specification)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const data = await MyGlobal.prisma.ecommerce_product_snapshots.findMany({
    where: { ecommerce_product_id: props.productId },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Count total snapshots
  const total = await MyGlobal.prisma.ecommerce_product_snapshots.count({
    where: { ecommerce_product_id: props.productId },
  });
  // Transform to DTO format with proper date conversion
  const transformedData = data.map(
    (snapshot) =>
      ({
        id: snapshot.id as string & tags.Format<"uuid">,
        created_at: snapshot.created_at.toISOString() as string &
          tags.Format<"date-time">,
        name: snapshot.name,
        description: snapshot.description,
        base_price: snapshot.base_price,
        seller_id: snapshot.seller_id as string & tags.Format<"uuid">,
        category_id: snapshot.category_id as string & tags.Format<"uuid">,
        modified_by_seller_id:
          snapshot.modified_by_seller_id === null
            ? null
            : (snapshot.modified_by_seller_id as string & tags.Format<"uuid">),
        modified_by_administrator_id:
          snapshot.modified_by_administrator_id === null
            ? null
            : (snapshot.modified_by_administrator_id as string &
                tags.Format<"uuid">),
        change_reason: snapshot.change_reason,
        ecommerce_product_id: snapshot.ecommerce_product_id as string &
          tags.Format<"uuid">,
      }) satisfies IEcommerceProductSnapshot,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceProductSnapshot;
}
