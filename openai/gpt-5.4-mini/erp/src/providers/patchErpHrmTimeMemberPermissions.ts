import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberPermissions(props: {
  member: MemberPayload;
  body: IErpHrmTimePermission.IRequest;
}): Promise<IPageIErpHrmTimePermission.ISummary> {
  if (props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_permissionsWhereInput = {
    ...(props.body.deleted === true ? {} : { deleted_at: null }),
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            { key: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
  };
  const orderBy: Prisma.erp_hrm_time_permissionsOrderByWithRelationInput =
    props.body.sort === "key_desc"
      ? { key: "desc" }
      : props.body.sort === "description_asc"
        ? { description: "asc" }
        : props.body.sort === "description_desc"
          ? { description: "desc" }
          : props.body.sort === "createdAt_asc"
            ? { created_at: "asc" }
            : props.body.sort === "createdAt_desc"
              ? { created_at: "desc" }
              : props.body.sort === "updatedAt_asc"
                ? { updated_at: "asc" }
                : props.body.sort === "updatedAt_desc"
                  ? { updated_at: "desc" }
                  : props.body.sort === "deletedAt_asc"
                    ? { deleted_at: "asc" }
                    : props.body.sort === "deletedAt_desc"
                      ? { deleted_at: "desc" }
                      : { key: "asc" };
  const data = await MyGlobal.prisma.erp_hrm_time_permissions.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      key: true,
      description: true,
    },
  });
  const records = await MyGlobal.prisma.erp_hrm_time_permissions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (item) => ({
      id: item.id,
      key: item.key,
      description: item.description,
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
