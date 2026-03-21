import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberAtSummaryTransformer } from "../transformers/ErpHrmMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberMembers(props: {
  member: MemberPayload;
  body: IErpHrmMember.IRequest;
}): Promise<IPageIErpHrmMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.deletedAt === true
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(props.body.search && {
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.displayName && {
      display_name: { contains: props.body.displayName, mode: "insensitive" },
    }),
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
  } satisfies Prisma.erp_hrm_membersWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_members.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIErpHrmMember.ISummary;
}
