import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReviewVote";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallCustomerSalesSaleIdReviewVotes(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReviewVote.IRequest;
}): Promise<IPageIShoppingMallSaleReviewVote.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (!sale) throw new HttpException("Sale not found", 404);
  if (sale.seller_id !== props.customer.id)
    throw new HttpException("Forbidden", 403);
  const where: Prisma.shopping_mall_sale_review_votesWhereInput = {
    deleted_at: null,
    review: {
      deleted_at: null,
      shopping_mall_sale_id: props.saleId,
    },
    ...(props.body.actor_type ? { actor_type: props.body.actor_type } : {}),
    ...(props.body.voter_id ? { voter_id: props.body.voter_id } : {}),
    ...(props.body.createdAtGte || props.body.createdAtLte
      ? {
          created_at: {
            ...(props.body.createdAtGte
              ? { gte: props.body.createdAtGte }
              : {}),
            ...(props.body.createdAtLte
              ? { lte: props.body.createdAtLte }
              : {}),
          },
        }
      : {}),
  };
  const total = await MyGlobal.prisma.shopping_mall_sale_review_votes.count({
    where,
  });
  const votes = await MyGlobal.prisma.shopping_mall_sale_review_votes.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      actor_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      review: {
        select: {
          id: true,
          rating: true,
          body: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          shopping_mall_sale: {
            select: {
              id: true,
              name: true,
              base_price: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              seller: {
                select: {
                  id: true,
                  email: true,
                  shop_name: true,
                  shop_description: true,
                  logo_uri: true,
                  approval_status: true,
                  rejection_reason: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              email: true,
              display_name: true,
              phone_number: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      voter: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(votes, async (v) => ({
      id: v.id,
      actorType: v.actor_type,
      createdAt: toISOStringSafe(v.created_at),
      updatedAt: toISOStringSafe(v.updated_at),
      deletedAt: v.deleted_at ? toISOStringSafe(v.deleted_at) : null,
      review: {
        id: v.review.id,
        rating: v.review.rating,
        body: v.review.body ?? null,
        created_at: toISOStringSafe(v.review.created_at),
        updated_at: toISOStringSafe(v.review.updated_at),
        deleted_at: v.review.deleted_at
          ? toISOStringSafe(v.review.deleted_at)
          : null,
        sale: {
          id: v.review.shopping_mall_sale.id,
          name: v.review.shopping_mall_sale.name,
          basePrice: v.review.shopping_mall_sale.base_price,
          status: v.review.shopping_mall_sale.status,
          createdAt: toISOStringSafe(v.review.shopping_mall_sale.created_at),
          updatedAt: toISOStringSafe(v.review.shopping_mall_sale.updated_at),
          deletedAt: v.review.shopping_mall_sale.deleted_at
            ? toISOStringSafe(v.review.shopping_mall_sale.deleted_at)
            : null,
          seller: {
            id: v.review.shopping_mall_sale.seller.id,
            email: v.review.shopping_mall_sale.seller.email,
            shopName: v.review.shopping_mall_sale.seller.shop_name,
            shopDescription:
              v.review.shopping_mall_sale.seller.shop_description ?? null,
            logoUri: v.review.shopping_mall_sale.seller.logo_uri ?? null,
            approvalStatus: v.review.shopping_mall_sale.seller.approval_status,
            rejectionReason:
              v.review.shopping_mall_sale.seller.rejection_reason ?? null,
          },
          category: {
            id: v.review.shopping_mall_sale.category.id,
            name: v.review.shopping_mall_sale.category.name,
            description: v.review.shopping_mall_sale.category.description,
            createdAt: toISOStringSafe(
              v.review.shopping_mall_sale.category.created_at,
            ),
            updatedAt: toISOStringSafe(
              v.review.shopping_mall_sale.category.updated_at,
            ),
            deletedAt: v.review.shopping_mall_sale.category.deleted_at
              ? toISOStringSafe(v.review.shopping_mall_sale.category.deleted_at)
              : null,
          },
        },
        customer: {
          id: v.review.customer.id,
          email: v.review.customer.email,
          displayName: v.review.customer.display_name ?? null,
          phoneNumber: v.review.customer.phone_number ?? null,
          createdAt: toISOStringSafe(v.review.customer.created_at),
          updatedAt: toISOStringSafe(v.review.customer.updated_at),
        },
      },
      voter: {
        id: v.voter.id,
        email: v.voter.email,
        displayName: v.voter.display_name ?? null,
        phoneNumber: v.voter.phone_number ?? null,
        createdAt: toISOStringSafe(v.voter.created_at),
        updatedAt: toISOStringSafe(v.voter.updated_at),
      },
    })),
  };
}
