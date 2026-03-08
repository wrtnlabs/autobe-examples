import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequestRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequestRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequestRequest> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_admin_request_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.request_status !== undefined && {
      request_status: props.body.request_status,
    }),
    ...(props.body.created_at_start !== undefined && {
      created_at: {
        gte: props.body.created_at_start,
      },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: {
        lte: props.body.created_at_end,
      },
    }),
    ...(props.body.reason_search !== undefined && {
      reason: {
        contains: props.body.reason_search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.ecommerce_mall_admin_request_requestsWhereInput;
  if (props.body.requester_type === "customer") {
    whereInput.customerRequests = {
      is: {
        id: {
          not: undefined,
        },
      },
    };
  } else if (props.body.requester_type === "seller") {
    whereInput.sellerRequests = {
      is: {
        id: {
          not: undefined,
        },
      },
    };
  }
  const orderByInput = (
    props.body.sort_by === "updated_at"
      ? { updated_at: props.body.sort_order ?? ("desc" as const) }
      : props.body.sort_by === "request_status"
        ? { request_status: props.body.sort_order ?? ("asc" as const) }
        : { created_at: props.body.sort_order ?? ("desc" as const) }
  ) satisfies Prisma.ecommerce_mall_admin_request_requestsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      include: {
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
        customerRequests: {
          select: {
            customer: {
              select: {
                id: true,
                email: true,
                deleted_at: true,
              },
            },
          },
        },
        sellerRequests: {
          select: {
            seller: {
              select: {
                id: true,
                email: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(data, async (request) => {
    const admin = await EcommerceMallAdminAtSummaryTransformer.transform(
      request.admin,
    );
    return {
      id: request.id,
      reason: request.reason,
      request_status: request.request_status as
        | "pending"
        | "approved"
        | "rejected",
      created_at: toISOStringSafe(request.created_at ?? new Date()),
      updated_at: toISOStringSafe(request.updated_at ?? new Date()),
      deleted_at: toISOStringSafe(request.deleted_at ?? new Date()),
      admin: admin,
    } satisfies IEcommerceMallAdminRequestRequest;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallAdminRequestRequest;
}
