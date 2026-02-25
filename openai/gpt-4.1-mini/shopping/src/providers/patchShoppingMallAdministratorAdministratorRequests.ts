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

export async function patchShoppingMallAdministratorAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorRequest.IRequest;
}): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 ? props.body.limit : 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_administrator_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.actorType ? { actor_type: props.body.actorType } : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.createdAfter || props.body.createdBefore
      ? {
          created_at: {
            ...(props.body.createdAfter
              ? { gte: props.body.createdAfter }
              : {}),
            ...(props.body.createdBefore
              ? { lte: props.body.createdBefore }
              : {}),
          },
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_administrator_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        actor_type: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_administrator_requests.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      actorType: record.actor_type,
      reason: record.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(record.status),
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
