import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAdministratorRequestsPending(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorRequest.IRequest;
}): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administrator.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (administrator.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    status: "pending",
    ...(props.body.keyword !== null
      ? {
          OR: [
            {
              reason: {
                contains: props.body.keyword,
                mode: "insensitive",
              },
            },
            {
              rejected_reason: {
                contains: props.body.keyword,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.shopping_mall_administrator_requestsWhereInput;
  const orderBy = (
    props.body.sort === "reason"
      ? { reason: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "updated_at"
        ? { updated_at: props.body.order === "asc" ? "asc" : "desc" }
        : { created_at: props.body.order === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.shopping_mall_administrator_requestsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        reason: true,
        status: true,
        rejected_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_requests.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      reason: record.reason,
      status: record.status,
      rejected_reason: record.rejected_reason,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
  };
}
