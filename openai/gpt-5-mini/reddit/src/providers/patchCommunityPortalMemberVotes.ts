import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import { IPageICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPortalMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPortalVote.IRequest;
}): Promise<IPageICommunityPortalVote.ISummary> {
  const { member, body } = props;

  // XOR semantics: cannot provide both postId and commentId
  if (body.postId !== undefined && body.commentId !== undefined) {
    throw new HttpException(
      "Bad Request: postId and commentId are mutually exclusive",
      400,
    );
  }

  // Pagination defaults and coercion
  const limit = Number(body.limit ?? 10);
  const offset = Number(body.offset ?? 0);
  const take = Math.max(1, limit);
  const skip = Math.max(0, offset);

  // Ordering: default to created_at desc
  const orderBy =
    body.sort === "value"
      ? { value: "desc" as const }
      : { created_at: "desc" as const };

  // Build where clause using only schema-verified fields
  const where: any = {
    // exclude soft-deleted by default
    ...(body.includeDeleted ? {} : { deleted_at: null }),
    ...(body.value !== undefined && { value: body.value }),
    // If requester asked for their own items
    ...(body.myItems === true && { user_id: member.id }),
    ...(body.postId !== undefined && { post_id: body.postId }),
    ...(body.commentId !== undefined && { comment_id: body.commentId }),
    // created_at range
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && {
                gte: toISOStringSafe(body.createdFrom),
              }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && {
                lte: toISOStringSafe(body.createdTo),
              }),
          },
        }
      : {}),
  };

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_portal_votes.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      MyGlobal.prisma.community_portal_votes.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      post_id: r.post_id === null ? null : r.post_id,
      comment_id: r.comment_id === null ? null : r.comment_id,
      value: r.value,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }));

    const pages = take > 0 ? Math.ceil(total / take) : 0;
    const current = take > 0 ? Math.floor(skip / take) + 1 : 1;

    return {
      pagination: {
        current: Number(current),
        limit: Number(take),
        records: Number(total),
        pages: Number(pages),
      },
      data,
    };
  } catch (err: unknown) {
    throw new HttpException("Internal Server Error", 500);
  }
}
