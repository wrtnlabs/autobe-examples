import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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

export async function patchEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        rating: true,
        text_content: true,
        created_at: true,
        updated_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            is_available: true,
            created_at: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                is_suspended: true,
                created_at: true,
              },
            },
            images: {
              select: {
                id: true,
                image_url: true,
                sort_order: true,
                is_main: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        order_item_id: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (record) => {
      const image =
        record.product.images.length > 0 ? record.product.images[0] : null;
      return {
        id: record.id,
        rating: record.rating,
        text_content: record.text_content ?? undefined,
        customer: {
          id: record.customer.id,
          email: record.customer.email,
          created_at: record.customer.created_at.toISOString(),
          is_suspended: record.customer.deleted_at !== null,
        } satisfies IEcommerceMallCustomer.ISummary,
        product: {
          id: record.product.id,
          name: record.product.name,
          base_price: record.product.base_price,
          is_available: record.product.is_available,
          created_at: record.product.created_at.toISOString(),
          seller: {
            id: record.product.seller.id,
            shop_name: record.product.seller.shop_name,
            approval_status: record.product.seller.approval_status,
            is_suspended: record.product.seller.is_suspended,
            created_at: record.product.seller.created_at.toISOString(),
          } satisfies IEcommerceMallSeller.ISummary,
          main_image: image
            ? ({
                id: image.id,
                image_url: image.image_url,
                sort_order: image.sort_order,
                is_main: image.is_main,
                created_at: image.created_at.toISOString(),
                updated_at: image.updated_at.toISOString(),
                deleted_at: image.deleted_at?.toISOString() ?? null,
              } satisfies IEcommerceMallProductImage.ISummary)
            : null,
        } satisfies IEcommerceMallProduct.ISummary,
        order_item_id: record.order_item_id,
        created_at: record.created_at.toISOString(),
        updated_at: record.updated_at.toISOString(),
      } satisfies IEcommerceMallReview.ISummary;
    }),
  };
}
