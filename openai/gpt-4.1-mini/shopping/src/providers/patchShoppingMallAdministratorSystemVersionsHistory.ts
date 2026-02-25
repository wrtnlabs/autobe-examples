import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
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

export async function patchShoppingMallAdministratorSystemVersionsHistory(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSystemVersion.IRequest;
}): Promise<IPageIShoppingMallSystemVersion.ISummary> {
  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit =
    props.body.pageSize !== undefined && props.body.pageSize !== null
      ? props.body.pageSize
      : 100;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Page size must be between 1 and 100", 400);
  }
  const where: Prisma.shopping_mall_system_versionsWhereInput = {
    deleted_at: null,
    ...(props.body.versionNumber !== undefined && {
      version_number: props.body.versionNumber,
    }),
    ...(props.body.createdAtStart !== undefined && {
      created_at: { gte: props.body.createdAtStart },
    }),
    ...(props.body.createdAtEnd !== undefined && {
      created_at: { lte: props.body.createdAtEnd },
    }),
    ...(props.body.entityName !== undefined && {
      entity_name: { equals: props.body.entityName },
    }),
  };
  const orderBy: Prisma.shopping_mall_system_versionsOrderByWithRelationInput =
    props.body.sortField === "versionNumber"
      ? { version_number: props.body.sortOrder ?? "desc" }
      : props.body.sortField === "createdAt"
        ? { created_at: props.body.sortOrder ?? "desc" }
        : { created_at: "desc" };
  const total = await MyGlobal.prisma.shopping_mall_system_versions.count({
    where,
  });
  const data = await MyGlobal.prisma.shopping_mall_system_versions.findMany({
    where,
    orderBy,
    take: limit,
    skip: (page - 1) * limit,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      entityName: item.entity_name,
      entityId: item.entity_id,
      versionNumber: item.version_number,
      changedFields: item.changed_fields,
      changeDescription:
        item.change_description === null ? null : item.change_description,
      changedBy: item.changed_by === null ? null : item.changed_by,
      createdAt: item.created_at.toISOString(),
      updatedAt: item.updated_at.toISOString(),
      deletedAt:
        item.deleted_at === null ? null : item.deleted_at.toISOString(),
    })),
  };
}
