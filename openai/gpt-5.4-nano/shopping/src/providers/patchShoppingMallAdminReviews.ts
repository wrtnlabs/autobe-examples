import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminReviews(props: {
  admin: AdminPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const pageRaw = props.body.page ?? 1;
  const limitRaw = props.body.limit ?? 100;
  const skip = (pageRaw - 1) * limitRaw;
  const sort: IShoppingMallReview.IRequest["sort"] =
    props.body.sort ?? "newest";
  const includeDeleted: boolean = props.body.includeDeleted ?? false;
  const where = {
    ...(props.body.shoppingMallProductId
      ? { shopping_mall_product_id: props.body.shoppingMallProductId }
      : {}),
    ...(props.body.shoppingMallOrderItemId
      ? {
          shopping_mall_order_item_id: props.body.shoppingMallOrderItemId,
        }
      : {}),
    ...(props.body.shoppingMallCustomerId
      ? { shopping_mall_customer_id: props.body.shoppingMallCustomerId }
      : {}),
    ...(includeDeleted ? {} : { deleted_at: null }),
  } satisfies Prisma.shopping_mall_reviewsWhereInput;
  const orderBy =
    sort === "oldest"
      ? ([
          { updated_at: "asc" },
          { created_at: "asc" },
        ] satisfies Prisma.Enumerable<Prisma.shopping_mall_reviewsOrderByWithRelationInput>)
      : ([
          { updated_at: "desc" },
          { created_at: "desc" },
        ] satisfies Prisma.Enumerable<Prisma.shopping_mall_reviewsOrderByWithRelationInput>);
  const rows = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where,
    skip,
    take: limitRaw,
    orderBy,
    select: {
      id: true,
      shopping_mall_product_id: true,
      shopping_mall_order_item_id: true,
      shopping_mall_customer_id: true,
      rating: true,
      body: true,
      is_public: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({ where });
  const brandUuid = (v: string) =>
    typia.assert<string & tags.Format<"uuid">>(v);
  const brandDateTime = (
    v: {
      toISOString: () => string;
    } | null,
  ) =>
    v === null
      ? null
      : typia.assert<string & tags.Format<"date-time">>(v.toISOString());
  const current = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    pageRaw,
  );
  const limit = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    limitRaw,
  );
  const records = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    total,
  );
  const pages = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    Math.ceil(total / limitRaw),
  );
  return {
    data: rows.map((r) => ({
      id: brandUuid(r.id),
      shoppingMallProductId: brandUuid(r.shopping_mall_product_id),
      shoppingMallOrderItemId: brandUuid(r.shopping_mall_order_item_id),
      shoppingMallCustomerId: brandUuid(r.shopping_mall_customer_id),
      rating: r.rating,
      body: r.body === null ? null : r.body,
      isPublic: r.is_public,
      deletedAt: brandDateTime(r.deleted_at),
      createdAt: typia.assert<string & tags.Format<"date-time">>(
        r.created_at.toISOString(),
      ),
      updatedAt: typia.assert<string & tags.Format<"date-time">>(
        r.updated_at.toISOString(),
      ),
    })),
    pagination: {
      current,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
  };
}
