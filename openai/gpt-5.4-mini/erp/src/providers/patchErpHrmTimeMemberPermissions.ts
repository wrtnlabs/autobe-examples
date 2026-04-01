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
import { ErpHrmTimePermissionAtSummaryTransformer } from "../transformers/ErpHrmTimePermissionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberPermissions(props: {
  member: MemberPayload;
  body: IErpHrmTimePermission.IRequest;
}): Promise<IPageIErpHrmTimePermission.ISummary> {
  if (props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const order = props.body.order ?? "asc";
  const search = props.body.search;
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "key" &&
    props.body.sort !== "description"
  ) {
    throw new HttpException("Unsupported sort field", 400);
  }
  const where = {
    deleted_at: null,
    ...(search === undefined
      ? {}
      : {
          OR: [
            { key: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
  } satisfies Prisma.erp_hrm_time_permissionsWhereInput;
  const orderBy = (
    props.body.sort === "description" ? { description: order } : { key: order }
  ) satisfies Prisma.erp_hrm_time_permissionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_time_permissions.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
    ...ErpHrmTimePermissionAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_permissions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimePermissionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
