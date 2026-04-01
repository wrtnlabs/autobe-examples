import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministrator";
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

export async function patchMallPlatformAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministrator.IRequest;
}): Promise<IPageIMallPlatformAdministrator.ISummary> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const sort: string = props.body.sort ?? "created_at_desc";
  const where: Prisma.mall_platform_administratorsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search !== ""
      ? { email: { contains: props.body.search, mode: "insensitive" } }
      : {}),
    ...(props.body.grade !== undefined ? { grade: props.body.grade } : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
  };
  const orderBy =
    sort === "email_asc"
      ? [{ email: "asc" as const }, { id: "asc" as const }]
      : sort === "email_desc"
        ? [{ email: "desc" as const }, { id: "asc" as const }]
        : sort === "grade_asc"
          ? [{ grade: "asc" as const }, { id: "asc" as const }]
          : sort === "grade_desc"
            ? [{ grade: "desc" as const }, { id: "asc" as const }]
            : sort === "status_asc"
              ? [{ status: "asc" as const }, { id: "asc" as const }]
              : sort === "status_desc"
                ? [{ status: "desc" as const }, { id: "asc" as const }]
                : sort === "created_at_asc"
                  ? [{ created_at: "asc" as const }, { id: "asc" as const }]
                  : sort === "created_at_desc"
                    ? [{ created_at: "desc" as const }, { id: "asc" as const }]
                    : sort === "updated_at_asc"
                      ? [{ updated_at: "asc" as const }, { id: "asc" as const }]
                      : sort === "updated_at_desc"
                        ? [
                            { updated_at: "desc" as const },
                            { id: "asc" as const },
                          ]
                        : [
                            { created_at: "desc" as const },
                            { id: "asc" as const },
                          ];
  const data = await MyGlobal.prisma.mall_platform_administrators.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      email: true,
      grade: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records = await MyGlobal.prisma.mall_platform_administrators.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: records === 0 ? 0 : Math.ceil(records / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      email: record.email,
      grade: record.grade,
      status: record.status,
      createdAt: record.created_at.toISOString(),
      updatedAt: record.updated_at.toISOString(),
      deletedAt:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
    })),
  };
}
