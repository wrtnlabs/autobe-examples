import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "../transformers/EcommerceSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerCancellationRequests(props: {
  seller: SellerPayload;
  body: IEcommerceCancellationRequest.IRequest;
}): Promise<IPageIEcommerceCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build base WHERE clause with seller authorization
  const whereInput = {
    deleted_at: null,
    seller: {
      id: props.seller.id,
      deleted_at: null,
    },
    ...(props.body.customer_id && {
      customer: { id: props.body.customer_id },
    }),
    ...(props.body.date_from && {
      created_at: {
        gte: new Date(props.body.date_from),
      },
    }),
    ...(props.body.date_to && {
      created_at: {
        lte: new Date(props.body.date_to),
      },
    }),
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.ecommerce_cancellation_requestsWhereInput;
  // For status filtering, we need to join with the latest status
  let data, total;
  if (props.body.status) {
    // Complex query with status join
    const cancellationRequests =
      await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
        where: whereInput,
        include: {
          statusTransitions: {
            orderBy: { created_at: "desc" },
            take: 1,
          },
          customer: {
            select: EcommerceCustomerAtSummaryTransformer.select().select,
          },
          seller: {
            select: EcommerceSellerAtSummaryTransformer.select().select,
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      });
    // Filter by latest status in memory
    const filteredRequests = cancellationRequests.filter(
      (request) => request.statusTransitions[0]?.status === props.body.status,
    );
    // Get total count with status filter
    const allRequests =
      await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
        where: whereInput,
        include: {
          statusTransitions: {
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
      });
    total = allRequests.filter(
      (request) => request.statusTransitions[0]?.status === props.body.status,
    ).length;
    // Transform the filtered data
    data = await Promise.all(
      filteredRequests.map(async (request) => ({
        id: request.id,
        reason: request.reason,
        customer: await EcommerceCustomerAtSummaryTransformer.transform(
          request.customer!,
        ),
        seller: await EcommerceSellerAtSummaryTransformer.transform(
          request.seller!,
        ),
        created_at: toISOStringSafe(request.created_at),
      })),
    );
  } else {
    // Simple query without status filtering
    const rawData =
      await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceCancellationRequestAtSummaryTransformer.select(),
      });
    total = await MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: whereInput,
    });
    data = await ArrayUtil.asyncMap(
      rawData,
      EcommerceCancellationRequestAtSummaryTransformer.transform,
    );
  }
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
