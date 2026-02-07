import { IEcommerceCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartSnapshotTransformer } from "../transformers/EcommerceCartSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerCartsCartIdSnapshots(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceCartSnapshot.IRequest;
}): Promise<IPageIEcommerceCartSnapshot.ISummary> {
  const cart = await MyGlobal.prisma.ecommerce_carts.findUnique({
    where: { id: props.cartId, deleted_at: null },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const snapshots = await MyGlobal.prisma.ecommerce_cart_snapshots.findMany({
    where: { ecommerce_cart_id: props.cartId, deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceCartSnapshotTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_cart_snapshots.count({
    where: { ecommerce_cart_id: props.cartId, deleted_at: null },
  });
  const transformedSnapshots = await ArrayUtil.asyncMap(
    snapshots,
    async (snapshot) => {
      return EcommerceCartSnapshotTransformer.transform(snapshot);
    },
  );
  return {
    data: transformedSnapshots,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } as IPage.IPagination,
  };
}
