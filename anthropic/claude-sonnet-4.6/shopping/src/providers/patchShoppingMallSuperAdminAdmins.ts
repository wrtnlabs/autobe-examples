import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

export async function patchShoppingMallSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch all super admin IDs for grade derivation and optional grade filtering
  const superAdmins = await MyGlobal.prisma.shopping_mall_super_admins.findMany(
    {
      select: { id: true },
    },
  );
  const superAdminIdSet = new Set(superAdmins.map((sa) => sa.id));
  const superAdminIdList = [...superAdminIdSet];
  // Build grade filter constraint
  const gradeFilter: Prisma.shopping_mall_adminsWhereInput =
    props.body.grade === "super"
      ? { id: { in: superAdminIdList } }
      : props.body.grade === "regular"
        ? { id: { notIn: superAdminIdList } }
        : {};
  // Build created_at range filter (combine both bounds into one object)
  const hasFrom =
    props.body.createdAtFrom !== undefined && props.body.createdAtFrom !== null;
  const hasTo =
    props.body.createdAtTo !== undefined && props.body.createdAtTo !== null;
  const createdAtFilter: Prisma.shopping_mall_adminsWhereInput =
    hasFrom || hasTo
      ? {
          created_at: {
            ...(hasFrom ? { gte: new Date(props.body.createdAtFrom!) } : {}),
            ...(hasTo ? { lte: new Date(props.body.createdAtTo!) } : {}),
          },
        }
      : {};
  // Build the complete WHERE input
  const whereInput = {
    ...(props.body.email !== undefined && props.body.email !== null
      ? { email: { contains: props.body.email, mode: "insensitive" as const } }
      : {}),
    ...(props.body.actorType !== undefined && props.body.actorType !== null
      ? { actor_type: props.body.actorType }
      : {}),
    ...(props.body.includeDeleted !== true ? { deleted_at: null } : {}),
    ...createdAtFilter,
    ...gradeFilter,
  } satisfies Prisma.shopping_mall_adminsWhereInput;
  // Build ORDER BY
  const orderByColumn =
    props.body.sortBy === "email"
      ? "email"
      : props.body.sortBy === "updatedAt"
        ? "updated_at"
        : "created_at";
  const orderByDirection: "asc" | "desc" =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const orderByInput = {
    [orderByColumn]: orderByDirection,
  } satisfies Prisma.shopping_mall_adminsOrderByWithRelationInput;
  // Fetch paginated data and total count sequentially
  const data = await MyGlobal.prisma.shopping_mall_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      actor_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (record) =>
        ({
          id: record.id,
          email: record.email,
          actor_type: typia.assert<"customer" | "seller">(record.actor_type),
          grade: superAdminIdSet.has(record.id)
            ? ("super" as const)
            : ("regular" as const),
          created_at: record.created_at.toISOString(),
          updated_at: record.updated_at.toISOString(),
          deleted_at: record.deleted_at?.toISOString() ?? null,
        }) satisfies IShoppingMallAdmin.ISummary,
    ),
  } satisfies IPageIShoppingMallAdmin.ISummary;
}
