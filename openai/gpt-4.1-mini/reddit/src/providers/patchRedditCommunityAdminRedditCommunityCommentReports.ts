import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityCommentReports(props: {
  admin: AdminPayload;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: any = {
    deleted_at: null,
  };

  if (props.body.search) {
    const search = props.body.search.trim();
    where.OR = [{ reason: { contains: search } }];
  }

  if (props.body.reportedUserId) {
    where.reddit_community_registereduser_id = props.body.reportedUserId;
  }

  if (props.body.status) {
    if (props.body.status === "pending") {
      where.deleted_at = null;
    } else if (props.body.status === "reviewed") {
      where.updated_at = { gt: new Date(0) };
    } else if (props.body.status === "closed") {
      where.deleted_at = { not: null };
    }
  }

  if (props.body.startDate || props.body.endDate) {
    where.created_at = {};
    if (props.body.startDate) {
      where.created_at.gte = props.body.startDate;
    }
    if (props.body.endDate) {
      where.created_at.lte = props.body.endDate;
    }
  }

  const orderBy: any = {};
  if (props.body.sortBy) {
    orderBy[props.body.sortBy] = props.body.sortOrder ?? "desc";
  } else {
    orderBy.created_at = "desc";
  }

  // Fetch raw data without includes
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_comment_reports.count({ where }),
  ]);

  // Fetch related comments and create a Map by id
  const commentIds = data.map((d) => d.reddit_community_comment_id);
  const comments = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: { id: { in: commentIds } },
  });
  const commentsById = new Map<string, (typeof comments)[0]>();
  for (const comment of comments) {
    commentsById.set(comment.id, comment);
  }

  // Fetch related registered users and create a Map by id
  const userIds = data.map((d) => d.reddit_community_registereduser_id);
  const registeredUsers =
    await MyGlobal.prisma.reddit_community_registeredusers.findMany({
      where: { id: { in: userIds } },
    });
  const usersById = new Map<string, (typeof registeredUsers)[0]>();
  for (const user of registeredUsers) {
    usersById.set(user.id, user);
  }

  // Map data
  const mappedData = data.map((item) => {
    const comment = commentsById.get(item.reddit_community_comment_id);
    const registeredUser = usersById.get(
      item.reddit_community_registereduser_id,
    );

    if (!comment) throw new HttpException("Related comment not found", 404);
    if (!registeredUser)
      throw new HttpException("Related registered user not found", 404);

    return {
      id: item.id,
      reason: item.reason,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      comment: {
        id: comment.id,
        content_snippet: comment.body.substring(0, 50),
        created_at: toISOStringSafe(comment.created_at),
        author: {
          id: comment.reddit_community_registereduser_id,
          email: registeredUser.email,
          created_at: toISOStringSafe(registeredUser.created_at),
          updated_at: toISOStringSafe(registeredUser.updated_at),
          deleted_at: registeredUser.deleted_at
            ? toISOStringSafe(registeredUser.deleted_at)
            : null,
        },
      },
      registeredUser: {
        id: registeredUser.id,
        email: registeredUser.email,
        created_at: toISOStringSafe(registeredUser.created_at),
        updated_at: toISOStringSafe(registeredUser.updated_at),
        deleted_at: registeredUser.deleted_at
          ? toISOStringSafe(registeredUser.deleted_at)
          : null,
      },
    };
  });

  return {
    data: mappedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
