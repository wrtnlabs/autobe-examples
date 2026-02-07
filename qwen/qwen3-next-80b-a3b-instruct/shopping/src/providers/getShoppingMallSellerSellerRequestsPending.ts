import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRequestResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestResponse";
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

export async function getShoppingMallSellerSellerRequestsPending(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallRequestResponse> {
  // Default pagination parameters - removed props.body references since not in schema
  const page = 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  // Query cancellation requests
  const cancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        status: "pending",
        orderItem: {
          seller_id: props.seller.id,
        },
      },
      include: {
        orderItem: {
          select: {
            seller_id: true,
          },
        },
        requestResponse: {
          select: {
            decision: true,
            reason: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
      skip: offset,
    });
  // Query refund requests
  const refundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        status: "pending",
        orderItem: {
          seller_id: props.seller.id,
        },
      },
      include: {
        orderItem: {
          select: {
            seller_id: true,
          },
        },
        requestResponse: {
          select: {
            decision: true,
            reason: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
      skip: offset,
    });
  // Combine and annotate requests with type
  const combined = [
    ...cancellationRequests.map((req) => ({
      ...req,
      request_type: "cancellation" as const,
    })),
    ...refundRequests.map((req) => ({
      ...req,
      request_type: "refund" as const,
    })),
  ];
  // Count total pending requests for pagination
  const total =
    (await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          seller_id: props.seller.id,
        },
      },
    })) +
    (await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          seller_id: props.seller.id,
        },
      },
    }));
  // Transform to final response structure
  const data = combined.map((req) => ({
    id: req.id,
    request_type: req.request_type,
    reason: req.reason,
    status: req.status,
    created_at: toISOStringSafe(req.created_at),
    updated_at: toISOStringSafe(req.updated_at),
    response: req.requestResponse
      ? {
          decision: req.requestResponse.decision,
          reason: req.requestResponse.reason,
          created_at: req.requestResponse.created_at
            ? toISOStringSafe(req.requestResponse.created_at)
            : null,
        }
      : null,
  }));
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
