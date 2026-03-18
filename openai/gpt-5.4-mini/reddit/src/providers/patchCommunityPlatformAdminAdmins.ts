import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
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

export async function patchCommunityPlatformAdminAdmins(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAdmin.IRequest;
}): Promise<IPageICommunityPlatformAdmin.ISummary> {
  const caller = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (caller === null) {
    throw new HttpException("Forbidden", 403);
  }
  const requestedPage: number = props.body.page ?? 1;
  const requestedLimit: number = props.body.limit ?? 100;
  const page: number = requestedPage < 1 ? 1 : requestedPage;
  const limit: number =
    requestedLimit < 1 ? 1 : requestedLimit > 100 ? 100 : requestedLimit;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const records = await MyGlobal.prisma.community_platform_admins.findMany({
    where: {
      deleted_at: null,
      ...(search !== undefined && search.length > 0
        ? {
            email: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip,
    take: limit,
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total: number = await MyGlobal.prisma.community_platform_admins.count({
    where: {
      deleted_at: null,
      ...(search !== undefined && search.length > 0
        ? {
            email: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      email: record.email,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
    })),
  };
}
