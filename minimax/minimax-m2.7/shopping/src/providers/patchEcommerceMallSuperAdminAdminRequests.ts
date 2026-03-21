import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminRequests(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause from filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.requested_grade && {
      requested_grade: props.body.requested_grade,
    }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" as const },
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.ecommerce_mall_admin_requestsWhereInput;
  // Query with reviewer join
  const data = await MyGlobal.prisma.ecommerce_mall_admin_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      actor_type: true,
      requested_grade: true,
      status: true,
      reason: true,
      created_at: true,
      updated_at: true,
      reviewer: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_admin_requests.count({
    where: whereInput,
  });
  // Transform to response DTO
  const transformedData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    actor_type: item.actor_type,
    requested_grade: item.requested_grade,
    status: item.status,
    reason: item.reason,
    created_at: item.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: item.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    reviewer: item.reviewer
      ? {
          id: item.reviewer.id as string & tags.Format<"uuid">,
          email: item.reviewer.email as string & tags.Format<"email">,
          created_at: item.reviewer.created_at.toISOString() as string &
            tags.Format<"date-time">,
          updated_at: item.reviewer.updated_at.toISOString() as string &
            tags.Format<"date-time">,
          deleted_at: item.reviewer.deleted_at?.toISOString() as
            | (string & tags.Format<"date-time">)
            | null,
        }
      : null,
  })) satisfies IEcommerceMallAdminRequest.ISummary[];
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
