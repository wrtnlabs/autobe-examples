import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformPermissionAtSummaryTransformer } from "../transformers/HrmPlatformPermissionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberPermissions(props: {
  member: MemberPayload;
  body: IHrmPlatformPermission.IRequest;
}): Promise<IPageIHrmPlatformPermission.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_permissionsWhereInput = {
    deleted_at: null,
    ...(props.body.category !== undefined && {
      category: props.body.category,
    }),
  };
  const data = await MyGlobal.prisma.hrm_platform_permissions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    ...HrmPlatformPermissionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_permissions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformPermissionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformPermission.ISummary;
}
