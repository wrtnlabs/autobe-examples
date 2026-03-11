import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardMemberEmailVerificationAtSummaryTransformer } from "../transformers/DiscussionBoardMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IDiscussionBoardMemberEmailVerification.IRequest;
}): Promise<IPageIDiscussionBoardMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    discussion_board_member_id: props.member.id,
    ...(props.body.is_verified !== undefined && {
      verified_at: props.body.is_verified ? { not: null } : null,
    }),
    ...(props.body.expires_at_from !== undefined && {
      expires_at: {
        gte: new Date(props.body.expires_at_from),
      },
    }),
    ...(props.body.expires_at_to !== undefined && {
      expires_at: {
        lte: new Date(props.body.expires_at_to),
      },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.discussion_board_member_email_verificationsWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_member_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardMemberEmailVerificationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_member_email_verifications.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardMemberEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
