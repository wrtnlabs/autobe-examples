import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeMemberEmailVerificationAtSummaryTransformer } from "../transformers/ErpHrmTimeMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IErpHrmTimeMemberEmailVerification.IRequest;
}): Promise<IPageIErpHrmTimeMemberEmailVerification.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_member_email_verificationsWhereInput = {
    member_id: props.body.memberId ?? props.member.id,
    ...(props.body.verifiedAt !== undefined && {
      verified_at: props.body.verifiedAt,
    }),
    ...(props.body.expiresAt !== undefined && props.body.expiresAt !== null
      ? {
          expires_at: props.body.expiresAt,
        }
      : {}),
    ...(props.body.deletedAt !== undefined && props.body.deletedAt !== null
      ? { deleted_at: props.body.deletedAt }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: props.body.createdAtFrom,
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: props.body.createdAtTo,
            }),
          },
        }
      : {}),
    ...(props.body.expiresAtFrom !== undefined ||
    props.body.expiresAtTo !== undefined
      ? {
          expires_at: {
            ...(props.body.expiresAtFrom !== undefined && {
              gte: props.body.expiresAtFrom,
            }),
            ...(props.body.expiresAtTo !== undefined && {
              lte: props.body.expiresAtTo,
            }),
          },
        }
      : {}),
  };
  const data =
    await MyGlobal.prisma.erp_hrm_time_member_email_verifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...ErpHrmTimeMemberEmailVerificationAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_member_email_verifications.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeMemberEmailVerificationAtSummaryTransformer.transform,
    ),
  };
}
