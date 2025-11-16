import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardComment";
import { IPageIEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconPolDiscussionBoardMemberEconPolDiscussionBoardComments(props: {
  member: MemberPayload;
  body: IEconPolDiscussionBoardComment.IRequest;
}): Promise<IPageIEconPolDiscussionBoardComment.ISummary> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit > 0 && props.body.limit <= 100 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null as null,
    ...(props.body.article_id !== undefined &&
      props.body.article_id !== null && { article_id: props.body.article_id }),
    ...(props.body.member_id !== undefined &&
      props.body.member_id !== null && {
        econ_pol_discussion_board_member_id: props.body.member_id,
      }),
    ...(props.body.parent_comment_id !== undefined &&
      props.body.parent_comment_id !== null && {
        parent_comment_id: props.body.parent_comment_id,
      }),
    AND: [
      ...(props.body.created_after
        ? [{ created_at: { gte: props.body.created_after } }]
        : []),
      ...(props.body.created_before
        ? [{ created_at: { lte: props.body.created_before } }]
        : []),
      ...(props.body.updated_after
        ? [{ updated_at: { gte: props.body.updated_after } }]
        : []),
      ...(props.body.updated_before
        ? [{ updated_at: { lte: props.body.updated_before } }]
        : []),
    ],
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_comments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.econ_pol_discussion_board_comments.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((c) => ({
      id: c.id,
      content: c.body,
      author: {
        id: c.econ_pol_discussion_board_member_id satisfies string as string,
        username: "",
        displayName: "",
        avatarUrl: undefined,
        memberSince: "",
      },
      created_at: toISOStringSafe(c.created_at),
    })),
  };
}
