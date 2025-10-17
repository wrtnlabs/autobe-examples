import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { IPageIRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeKarmaHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeKarmaHistory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditLikeMemberUsersUserIdKarmaHistory(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.IKarmaHistoryRequest;
}): Promise<IPageIRedditLikeKarmaHistory> {
  const { member, userId, body } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only view your own karma history",
      403,
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_karma_history.findMany({
      where: {
        reddit_like_member_id: userId,
        ...(body.karma_type !== undefined && {
          karma_type: body.karma_type,
        }),
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_karma_history.count({
      where: {
        reddit_like_member_id: userId,
        ...(body.karma_type !== undefined && {
          karma_type: body.karma_type,
        }),
      },
    }),
  ]);

  const data: IRedditLikeKarmaHistory[] = records.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    karma_type: record.karma_type,
    change_amount: record.change_amount,
    triggered_by_vote_action: record.triggered_by_vote_action,
    created_at: toISOStringSafe(record.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
