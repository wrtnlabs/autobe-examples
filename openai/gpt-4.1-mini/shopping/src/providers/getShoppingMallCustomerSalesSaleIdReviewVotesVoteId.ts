import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSaleReviewVoteTransformer } from "../transformers/ShoppingMallSaleReviewVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSalesSaleIdReviewVotesVoteId(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleReviewVote> {
  type SafeDate = Date | null | undefined;
  function isoString(date: SafeDate): string | null {
    return date ? date.toISOString() : null;
  }
  function convertDates<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map((o) => convertDates(o)) as unknown as T;
    }
    if (typeof obj === "object") {
      const newObj: any = {};
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const val = (obj as any)[key];
        if (val instanceof Date) {
          newObj[key] = isoString(val);
        } else {
          newObj[key] = convertDates(val);
        }
      }
      return newObj;
    }
    return obj;
  }
  const voteRaw =
    await MyGlobal.prisma.shopping_mall_sale_review_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        shopping_mall_product_review_id: true,
        voter_id: true,
        actor_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        review: {
          select: {
            id: true,
            customer: {
              select: {
                email: true,
                created_at: true,
                id: true,
                password_hash: true,
                updated_at: true,
                deleted_at: true,
                display_name: true,
                phone_number: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
            orderItem: {
              select: {
                created_at: true,
                id: true,
                updated_at: true,
                deleted_at: true,
                refundRequests: true,
                quantity: true,
                status: true,
                order: {
                  select: {
                    customer: {
                      select: {
                        email: true,
                        created_at: true,
                        id: true,
                        password_hash: true,
                        updated_at: true,
                        deleted_at: true,
                        display_name: true,
                        phone_number: true,
                      },
                    },
                    created_at: true,
                    id: true,
                    updated_at: true,
                    deleted_at: true,
                    reviews: true,
                    order_number: true,
                    total_price: true,
                    total_quantity: true,
                    order_status: true,
                    orderItemSnapshots: true,
                    orderItems: true,
                    orderSnapshots: true,
                  },
                },
                productVariant: {
                  select: {
                    created_at: true,
                    id: true,
                    updated_at: true,
                    deleted_at: true,
                    snapshots: true,
                    productReviews: true,
                    productReviewSnapshots: true,
                    orderItems: true,
                    sku_code: true,
                    price_override: true,
                    stock_quantity: true,
                    product: true,
                    inventoryHistories: true,
                  },
                },
                snapshots: true,
                shipmentItems: true,
                cancellationRequests: true,
                reviews: true,
                shipmentOrderItems: true,
                productReviews: true,
                productReviewSnapshots: true,
              },
            },
            productVariant: {
              select: {
                created_at: true,
                id: true,
                updated_at: true,
                deleted_at: true,
                snapshots: true,
                productReviews: true,
                productReviewSnapshots: true,
                orderItems: true,
                sku_code: true,
                price_override: true,
                stock_quantity: true,
                product: true,
                inventoryHistories: true,
              },
            },
            productReviewSnapshots: true,
            rating: true,
            body: true,
            reviewSnapshots: true,
            saleReviewVotes: true,
          },
        },
        voter: {
          select: {
            email: true,
            created_at: true,
            id: true,
            password_hash: true,
            updated_at: true,
            deleted_at: true,
            display_name: true,
            phone_number: true,
          },
        },
      },
    });
  if (
    !voteRaw.review ||
    voteRaw.shopping_mall_product_review_id !== props.saleId
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const voteConverted = convertDates(voteRaw) as typeof voteRaw & {
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: string | null;
    review: {
      created_at: string & tags.Format<"date-time">;
      updated_at: string & tags.Format<"date-time">;
      deleted_at: string | null;
      customer: {
        created_at: string & tags.Format<"date-time">;
        updated_at: string & tags.Format<"date-time">;
        deleted_at: string | null;
      };
      orderItem: unknown;
      productVariant: unknown;
      productReviewSnapshots: unknown[];
      rating: number;
      body: string | null;
      reviewSnapshots: unknown[];
      saleReviewVotes: unknown[];
    };
    voter: {
      created_at: string & tags.Format<"date-time">;
      updated_at: string & tags.Format<"date-time">;
      deleted_at: string | null;
    };
  };
  return await ShoppingMallSaleReviewVoteTransformer.transform(voteConverted);
}
