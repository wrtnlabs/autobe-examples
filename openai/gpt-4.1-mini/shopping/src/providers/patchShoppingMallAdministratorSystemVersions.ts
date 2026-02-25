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

export async function patchShoppingMallAdministratorSystemVersions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSystemVersion.IRequest;
}): Promise<IPageIShoppingMallSystemVersion.ISummary> {
  const toDate = (value: string | undefined): Date | undefined => {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
  };
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const createdAtStartDate = toDate(props.body.createdAtStart);
  const createdAtEndDate = toDate(props.body.createdAtEnd);
  const where: Prisma.shopping_mall_system_versionsWhereInput = {
    deleted_at: null,
    ...(props.body.versionNumber !== undefined
      ? { version_number: props.body.versionNumber }
      : {}),
    ...(createdAtStartDate ? { created_at: { gte: createdAtStartDate } } : {}),
    ...(createdAtEndDate ? { created_at: { lte: createdAtEndDate } } : {}),
    ...(props.body.entityName !== undefined
      ? { entity_name: props.body.entityName }
      : {}),
  };
  const orderBy: Prisma.shopping_mall_system_versionsOrderByWithRelationInput =
    props.body.sortField && props.body.sortOrder
      ? { [props.body.sortField]: props.body.sortOrder }
      : { created_at: "desc" };
  const [records, data] = await Promise.all([
    MyGlobal.prisma.shopping_mall_system_versions.count({ where }),
    MyGlobal.prisma.shopping_mall_system_versions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        entity_name: true,
        entity_id: true,
        version_number: true,
        changed_fields: true,
        change_description: true,
        changed_by: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((item) => {
      const id = item.id;
      const entityName = item.entity_name;
      const entityId = item.entity_id;
      const versionNumber = item.version_number;
      const changedFields = item.changed_fields;
      const changeDescription = item.change_description ?? null;
      const changedBy = item.changed_by ?? null;
      const createdAt = item.created_at.toISOString();
      const updatedAt = item.updated_at.toISOString();
      const deletedAt = item.deleted_at?.toISOString() ?? null;
      return {
        id,
        entityName,
        entityId,
        versionNumber,
        changedFields,
        changeDescription,
        changedBy,
        createdAt,
        updatedAt,
        deletedAt,
      };
    }),
  };
}
