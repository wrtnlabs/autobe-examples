import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberEmailVerificationAtSummaryTransformer } from "../transformers/HrmsMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmsMemberEmailVerification.IRequest;
}): Promise<IPageIHrmsMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  let whereInput: Prisma.hrms_member_email_verificationsWhereInput = {
    deleted_at: null,
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.expires_at_from !== undefined && {
      expires_at: { gte: new Date(props.body.expires_at_from) },
    }),
    ...(props.body.expires_at_to !== undefined && {
      expires_at: { lte: new Date(props.body.expires_at_to) },
    }),
  } satisfies Prisma.hrms_member_email_verificationsWhereInput;
  if (props.body.status === "active") {
    whereInput = {
      ...whereInput,
      deleted_at: null,
      used_at: null,
      expires_at: { gt: now },
    };
  } else if (props.body.status === "used") {
    whereInput = {
      ...whereInput,
      deleted_at: { not: null },
      used_at: { not: null },
    };
  } else if (props.body.status === "expired") {
    whereInput = {
      ...whereInput,
      deleted_at: { not: null },
      expires_at: { lte: now },
    };
  }
  const orderByInput: Prisma.hrms_member_email_verificationsOrderByWithRelationInput[] =
    [
      (props.body.sort_by === "created_at"
        ? {
            created_at:
              props.body.sort_order === "desc" ? "desc" : ("asc" as const),
          }
        : props.body.sort_by === "expires_at"
          ? {
              expires_at:
                props.body.sort_order === "desc" ? "desc" : ("asc" as const),
            }
          : props.body.sort_by === "used_at"
            ? {
                used_at:
                  props.body.sort_order === "desc" ? "desc" : ("asc" as const),
              }
            : {
                created_at: "desc" as const,
              }) satisfies Prisma.hrms_member_email_verificationsOrderByWithRelationInput,
    ];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrms_member_email_verifications.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmsMemberEmailVerificationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrms_member_email_verifications.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmsMemberEmailVerificationAtSummaryTransformer.transform,
    ),
  };
}
