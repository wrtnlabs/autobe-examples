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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSalesSaleIdReviewVotes(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReviewVote.IRequest;
}): Promise<IPageIShoppingMallSaleReviewVote.ISummary> {
  const { seller, saleId, body } = props;
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: saleId },
    select: { seller_id: true },
  });
  if (!sale) throw new HttpException("Sale not found", 404);
  if (sale.seller_id !== seller.id) throw new HttpException("Forbidden", 403);
  const page = (body.page ?? 1) >= 1 ? (body.page ?? 1) : 1;
  const limit =
    body.limit && body.limit >= 1 && body.limit <= 100 ? body.limit : 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_review_votesWhereInput = {
    deleted_at: null,
    ...(body.actor_type ? { actor_type: body.actor_type } : {}),
    ...(body.voter_id ? { voter_id: body.voter_id } : {}),
    ...(body.createdAtGte ? { created_at: { gte: body.createdAtGte } } : {}),
    ...(body.createdAtLte ? { created_at: { lte: body.createdAtLte } } : {}),
  };
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
      shopping_mall_product_review_id: true,
      voter_id: true,
    },
  });
  const reviewIds = [
    ...new Set(votes.map((v) => v.shopping_mall_product_review_id)),
  ];
  if (reviewIds.length === 0) {
    return {
      pagination: { current: page, limit, records: 0, pages: 0 },
      data: [],
    };
  }
  const voterIds = [...new Set(votes.map((v) => v.voter_id))];
  const reviews = await MyGlobal.prisma.shopping_mall_sale_reviews.findMany({
    where: { id: { in: reviewIds } },
    select: {
      id: true,
      rating: true,
      body: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      shopping_mall_sale_id: true,
      shopping_mall_customer_id: true,
    },
  });
  const reviewMap = new Map(reviews.map((r) => [r.id, r]));
  const saleIds = [...new Set(reviews.map((r) => r.shopping_mall_sale_id))];
  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where: { id: { in: saleIds } },
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
  });
  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const customerIds = [
    ...new Set(reviews.map((r) => r.shopping_mall_customer_id)),
  ];
  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
    },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const voters = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: { id: { in: voterIds } },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
    },
  });
  const voterMap = new Map(voters.map((v) => [v.id, v]));
  const total = await MyGlobal.prisma.shopping_mall_sale_review_votes.count({
    where,
  });
  const mappedData: IShoppingMallSaleReviewVote.ISummary[] = votes.map(
    (vote) => {
      const review = reviewMap.get(vote.shopping_mall_product_review_id);
      const sale = review
        ? saleMap.get(review.shopping_mall_sale_id)
        : undefined;
      const customer = review?.shopping_mall_customer_id
        ? customerMap.get(review.shopping_mall_customer_id)
        : undefined;
      const voter = voterMap.get(vote.voter_id);
      return {
        id: vote.id,
        actorType: vote.actor_type,
        createdAt: toISOStringSafe(vote.created_at),
        updatedAt: toISOStringSafe(vote.updated_at),
        deletedAt: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
        review: review
          ? {
              id: review.id,
              rating: review.rating,
              body: review.body,
              created_at: toISOStringSafe(review.created_at),
              updated_at: toISOStringSafe(review.updated_at),
              deleted_at: review.deleted_at
                ? toISOStringSafe(review.deleted_at)
                : null,
              sale: sale
                ? {
                    id: sale.id,
                    name: sale.name,
                    basePrice: sale.base_price,
                    status: sale.status,
                    createdAt: toISOStringSafe(sale.created_at),
                    updatedAt: toISOStringSafe(sale.updated_at),
                    deletedAt: sale.deleted_at
                      ? toISOStringSafe(sale.deleted_at)
                      : null,
                    seller: {
                      id: sale.seller.id,
                      email: sale.seller.email,
                      shopName: sale.seller.shop_name,
                      shopDescription: sale.seller.shop_description,
                      logoUri: sale.seller.logo_uri,
                      approvalStatus: sale.seller.approval_status,
                      rejectionReason: sale.seller.rejection_reason,
                    },
                    category: sale.category
                      ? {
                          id: sale.category.id,
                          name: sale.category.name,
                          description: sale.category.description,
                          createdAt: toISOStringSafe(sale.category.created_at),
                          updatedAt: toISOStringSafe(sale.category.updated_at),
                          deletedAt: sale.category.deleted_at
                            ? toISOStringSafe(sale.category.deleted_at)
                            : null,
                        }
                      : {
                          id: "",
                          name: "",
                          description: "",
                          createdAt: "1970-01-01T00:00:00.000Z",
                          updatedAt: "1970-01-01T00:00:00.000Z",
                          deletedAt: null,
                        },
                  }
                : {
                    id: "",
                    name: "",
                    basePrice: 0,
                    status: "pending",
                    createdAt: "1970-01-01T00:00:00.000Z",
                    updatedAt: "1970-01-01T00:00:00.000Z",
                    deletedAt: null,
                    seller: {
                      id: "",
                      email: "",
                      shopName: "",
                      shopDescription: "",
                      logoUri: "",
                      approvalStatus: "pending",
                      rejectionReason: "",
                    },
                    category: {
                      id: "",
                      name: "",
                      description: "",
                      createdAt: "1970-01-01T00:00:00.000Z",
                      updatedAt: "1970-01-01T00:00:00.000Z",
                      deletedAt: null,
                    },
                  },
              customer: customer
                ? {
                    id: customer.id,
                    email: customer.email,
                    displayName:
                      customer.display_name === null
                        ? undefined
                        : customer.display_name,
                    phoneNumber:
                      customer.phone_number === null
                        ? undefined
                        : customer.phone_number,
                    createdAt: toISOStringSafe(customer.created_at),
                    updatedAt: toISOStringSafe(customer.updated_at),
                  }
                : {
                    id: "",
                    email: "",
                    displayName: "",
                    phoneNumber: "",
                    createdAt: "1970-01-01T00:00:00.000Z",
                    updatedAt: "1970-01-01T00:00:00.000Z",
                  },
            }
          : {
              id: "",
              rating: 0,
              body: "",
              created_at: "1970-01-01T00:00:00.000Z",
              updated_at: "1970-01-01T00:00:00.000Z",
              deleted_at: null,
              sale: {
                id: "",
                name: "",
                basePrice: 0,
                status: "pending",
                createdAt: "1970-01-01T00:00:00.000Z",
                updatedAt: "1970-01-01T00:00:00.000Z",
                deletedAt: null,
                seller: {
                  id: "",
                  email: "",
                  shopName: "",
                  shopDescription: "",
                  logoUri: "",
                  approvalStatus: "pending",
                  rejectionReason: "",
                },
                category: {
                  id: "",
                  name: "",
                  description: "",
                  createdAt: "1970-01-01T00:00:00.000Z",
                  updatedAt: "1970-01-01T00:00:00.000Z",
                  deletedAt: null,
                },
              },
              customer: {
                id: "",
                email: "",
                displayName: "",
                phoneNumber: "",
                createdAt: "1970-01-01T00:00:00.000Z",
                updatedAt: "1970-01-01T00:00:00.000Z",
              },
            },
        voter: voter
          ? {
              id: voter.id,
              email: voter.email,
              displayName:
                voter.display_name === null ? undefined : voter.display_name,
              phoneNumber:
                voter.phone_number === null ? undefined : voter.phone_number,
              createdAt: toISOStringSafe(voter.created_at),
              updatedAt: toISOStringSafe(voter.updated_at),
            }
          : {
              id: "",
              email: "",
              displayName: "",
              phoneNumber: "",
              createdAt: "1970-01-01T00:00:00.000Z",
              updatedAt: "1970-01-01T00:00:00.000Z",
            },
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
