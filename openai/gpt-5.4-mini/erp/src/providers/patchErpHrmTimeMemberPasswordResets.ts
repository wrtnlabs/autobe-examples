import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeMemberPasswordResetAtSummaryTransformer } from "../transformers/ErpHrmTimeMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberPasswordResets(props: {
  member: MemberPayload;
  body: IErpHrmTimeMemberPasswordReset.IRequest;
}): Promise<IPageIErpHrmTimeMemberPasswordReset.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const current: string & tags.Format<"date-time"> =
    new globalThis.Date().toISOString() as string & tags.Format<"date-time">;
  const where: Prisma.erp_hrm_time_member_password_resetsWhereInput = {
    deleted_at: null,
    ...(props.body.erpHrmTimeMemberId !== undefined && {
      erp_hrm_time_member_id: props.body.erpHrmTimeMemberId,
    }),
    ...(props.body.token !== undefined && { token: props.body.token }),
    ...(props.body.status === "unused"
      ? { used_at: null, expires_at: { gt: new globalThis.Date(current) } }
      : props.body.status === "used"
        ? { used_at: { not: null } }
        : props.body.status === "expired"
          ? { used_at: null, expires_at: { lte: new globalThis.Date(current) } }
          : {}),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        ...(props.body.createdAt.from !== null && {
          gte: new globalThis.Date(props.body.createdAt.from),
        }),
        ...(props.body.createdAt.to !== null && {
          lte: new globalThis.Date(props.body.createdAt.to),
        }),
      },
    }),
    ...(props.body.expiresAt !== undefined && {
      expires_at: {
        ...(props.body.expiresAt.from !== null && {
          gte: new globalThis.Date(props.body.expiresAt.from),
        }),
        ...(props.body.expiresAt.to !== null && {
          lte: new globalThis.Date(props.body.expiresAt.to),
        }),
      },
    }),
  };
  const orderBy: Prisma.erp_hrm_time_member_password_resetsOrderByWithRelationInput =
    props.body.sort === "createdAtAsc"
      ? { created_at: "asc" }
      : props.body.sort === "expiresAtAsc"
        ? { expires_at: "asc" }
        : props.body.sort === "expiresAtDesc"
          ? { expires_at: "desc" }
          : { created_at: "desc" };
  const data =
    await MyGlobal.prisma.erp_hrm_time_member_password_resets.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...ErpHrmTimeMemberPasswordResetAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_member_password_resets.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeMemberPasswordResetAtSummaryTransformer.transform,
    ),
  };
}
