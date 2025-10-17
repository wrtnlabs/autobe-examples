import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import { IEEconDiscussPostVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteType";
import { IEEconDiscussPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteStatus";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberMeVotes(props: {
  member: MemberPayload;
}): Promise<IPageIEconDiscussPostVote.ISummary> {
  const { member } = props;

  const current = 0;
  const limit = 20;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_votes.findMany({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        econ_discuss_post_id: true,
        vote_type: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      skip: current * limit,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_post_votes.count({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
      },
    }),
  ]);

  const data: IEconDiscussPostVote.ISummary[] = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    postId: row.econ_discuss_post_id as string & tags.Format<"uuid">,
    voteType: row.vote_type as IEEconDiscussPostVoteType,
    status: row.status as IEEconDiscussPostVoteStatus,
    createdAt: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
