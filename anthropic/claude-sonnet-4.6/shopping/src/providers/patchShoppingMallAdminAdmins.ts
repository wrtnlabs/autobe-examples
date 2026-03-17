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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder =
    body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const);
  const orderByInput = (
    body.sortBy === "email"
      ? { email: sortOrder }
      : body.sortBy === "updatedAt"
        ? { updated_at: sortOrder }
        : { created_at: sortOrder }
  ) satisfies Prisma.shopping_mall_adminsOrderByWithRelationInput;
  // Resolve grade filter by looking up super admin emails
  let gradeEmailCondition:
    | {
        email: {
          in: string[];
        };
      }
    | {
        email: {
          notIn: string[];
        };
      }
    | undefined = undefined;
  if (body.grade === "super" || body.grade === "regular") {
    const superAdmins =
      await MyGlobal.prisma.shopping_mall_super_admins.findMany({
        select: { email: true },
      });
    const superEmails = superAdmins.map((sa) => sa.email);
    gradeEmailCondition =
      body.grade === "super"
        ? { email: { in: superEmails } }
        : { email: { notIn: superEmails } };
  }
  // Build AND conditions to safely combine email search and grade filter
  const andConditions: Prisma.shopping_mall_adminsWhereInput[] = [];
  if (
    body.email !== undefined &&
    body.email !== null &&
    body.email.length > 0
  ) {
    andConditions.push({
      email: { contains: body.email, mode: "insensitive" },
    });
  }
  if (gradeEmailCondition !== undefined) {
    andConditions.push(gradeEmailCondition);
  }
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (body.createdAtFrom !== undefined && body.createdAtFrom !== null) {
    createdAtFilter.gte = new Date(body.createdAtFrom);
  }
  if (body.createdAtTo !== undefined && body.createdAtTo !== null) {
    createdAtFilter.lte = new Date(body.createdAtTo);
  }
  const whereInput = {
    ...(body.actorType !== undefined && body.actorType !== null
      ? { actor_type: body.actorType }
      : {}),
    ...(body.includeDeleted !== true ? { deleted_at: null } : {}),
    ...(Object.keys(createdAtFilter).length > 0
      ? { created_at: createdAtFilter }
      : {}),
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  } satisfies Prisma.shopping_mall_adminsWhereInput;
  const records = await MyGlobal.prisma.shopping_mall_admins.findMany({
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
  // Determine grade for the returned records by checking super admin table
  const returnedEmails = records.map((r) => r.email);
  const superEmailSet = new Set<string>(
    returnedEmails.length > 0
      ? (
          await MyGlobal.prisma.shopping_mall_super_admins.findMany({
            where: { email: { in: returnedEmails } },
            select: { email: true },
          })
        ).map((sa) => sa.email)
      : [],
  );
  const data: IShoppingMallAdmin.ISummary[] = records.map((record) => {
    const grade: "super" | "regular" = superEmailSet.has(record.email)
      ? "super"
      : "regular";
    const actor_type: "customer" | "seller" =
      record.actor_type === "seller" ? "seller" : "customer";
    return {
      id: record.id as string & tags.Format<"uuid">,
      email: record.email as string & tags.Format<"email">,
      actor_type,
      grade,
      created_at: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: record.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at:
        record.deleted_at !== null && record.deleted_at !== undefined
          ? (record.deleted_at.toISOString() as string &
              tags.Format<"date-time">)
          : null,
    } satisfies IShoppingMallAdmin.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
