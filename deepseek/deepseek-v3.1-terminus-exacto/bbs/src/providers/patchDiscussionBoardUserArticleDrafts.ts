import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserArticleDrafts(props: {
  user: UserPayload;
  body: IDiscussionBoardArticleDraft.IRequest;
}): Promise<IPageIDiscussionBoardArticleDraft.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    draft_deleted_at: null,
    ...(props.body.draft_status && { draft_status: props.body.draft_status }),
    ...(props.body.last_saved_after && {
      last_saved_at: { gte: new Date(props.body.last_saved_after) },
    }),
    ...(props.body.last_saved_before && {
      last_saved_at: { lte: new Date(props.body.last_saved_before) },
    }),
    ...(props.body.search && {
      OR: [
        { draft_title: { contains: props.body.search } },
        { draft_content: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.discussion_board_article_draftsWhereInput;
  // Get paginated data
  const data = await MyGlobal.prisma.discussion_board_article_drafts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { last_saved_at: "desc" as const },
    select: {
      id: true,
      draft_title: true,
      draft_status: true,
      last_saved_at: true,
      draft_updated_at: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_article_drafts.count({
    where: whereInput,
  });
  // Transform data to response format
  const transformedData = data.map((draft) => ({
    id: draft.id as string & tags.Format<"uuid">,
    draft_title: draft.draft_title,
    draft_status: draft.draft_status as "draft" | "published" | "archived",
    last_saved_at: toISOStringSafe(draft.last_saved_at),
    draft_updated_at: toISOStringSafe(draft.draft_updated_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
