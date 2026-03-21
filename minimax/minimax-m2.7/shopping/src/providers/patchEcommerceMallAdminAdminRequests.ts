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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_admin_requestsWhereInput = {
    deleted_at: null,
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.actor_type !== undefined) {
    whereInput.actor_type = props.body.actor_type;
  }
  if (props.body.requested_grade !== undefined) {
    whereInput.requested_grade = props.body.requested_grade;
  }
  if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to !== undefined) {
    whereInput.created_at = {
      ...(whereInput.created_at as object),
      lte: new Date(props.body.created_at_to),
    };
  }
  if (props.body.reason !== undefined) {
    whereInput.reason = {
      contains: props.body.reason,
      mode: "insensitive",
    };
  }
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
      created_at: true,
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
  const total = await MyGlobal.prisma.ecommerce_mall_admin_requests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      actor_type: record.actor_type,
      requested_grade: record.requested_grade,
      status: record.status,
      created_at: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
      reviewer:
        record.reviewer !== null
          ? {
              id: record.reviewer.id as string & tags.Format<"uuid">,
              email: record.reviewer.email as string & tags.Format<"email">,
              created_at: record.reviewer.created_at.toISOString() as string &
                tags.Format<"date-time">,
              updated_at: record.reviewer.updated_at.toISOString() as string &
                tags.Format<"date-time">,
              deleted_at:
                record.reviewer.deleted_at !== null
                  ? (record.reviewer.deleted_at.toISOString() as string &
                      tags.Format<"date-time">)
                  : null,
            }
          : null,
    })),
  };
}
