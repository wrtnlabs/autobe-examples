import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserPostsPostIdEditHistories(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostEditHistory.IRequest;
}): Promise<IPageICommunityPlatformPostEditHistory> {
  const { postId, body } = props;
  const page = Number(body.page);
  const pageSize = Number(body.page_size);

  // 1. Ensure the referenced post exists and is not soft-deleted
  const postExists = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!postExists) {
    throw new HttpException("Post not found", 404);
  }

  // 2. Prepare search filter for edit histories (contains, no mode)
  const baseWhere = {
    community_platform_post_id: postId,
    ...(body.search && {
      OR: [
        { snapshot_title: { contains: body.search } },
        { snapshot_body: { contains: body.search } },
        { snapshot_url: { contains: body.search } },
        { snapshot_image_uri: { contains: body.search } },
        { edit_reason: { contains: body.search } },
      ],
    }),
  };

  // 3. Prepare DB orderBy
  let orderBy: any = { created_at: "desc" };
  if (body.sort_by === "reason") {
    orderBy = { edit_reason: body.sort_order === "asc" ? "asc" : "desc" };
  } else if (body.sort_by === "edited_at") {
    orderBy = { created_at: body.sort_order === "asc" ? "asc" : "desc" };
  }

  // 4. Query histories and total count concurrently
  const [total, rawHistories] = await Promise.all([
    MyGlobal.prisma.community_platform_post_edit_histories.count({
      where: baseWhere,
    }),
    MyGlobal.prisma.community_platform_post_edit_histories.findMany({
      where: baseWhere,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_user_id: true,
        edit_type: true,
        snapshot_title: true,
        snapshot_body: true,
        snapshot_url: true,
        snapshot_image_uri: true,
        edit_reason: true,
        created_at: true,
      },
    }),
  ]);

  // 5. Fetch editor user summaries for all distinct editor_user_id
  const distinctEditorIds = Array.from(
    new Set(rawHistories.map((h) => h.community_platform_user_id)),
  );
  const editorSummaries =
    await MyGlobal.prisma.community_platform_users.findMany({
      where: { id: { in: distinctEditorIds } },
      select: { id: true, display_name: true },
    });
  const editorMap: Record<string, ICommunityPlatformUser.ISummary> = {};
  for (const usr of editorSummaries) {
    editorMap[usr.id] = { id: usr.id, display_name: usr.display_name };
  }

  // 6. Build histories and attach .editor_user if available
  let histories = rawHistories.map((h) => {
    return {
      id: h.id,
      community_platform_post_id: h.community_platform_post_id,
      community_platform_user_id: h.community_platform_user_id,
      editor_user: editorMap[h.community_platform_user_id],
      edit_type: h.edit_type,
      snapshot_title: h.snapshot_title,
      snapshot_body: h.snapshot_body ?? null,
      snapshot_url: h.snapshot_url ?? null,
      snapshot_image_uri: h.snapshot_image_uri ?? null,
      edit_reason: h.edit_reason ?? null,
      created_at: toISOStringSafe(h.created_at),
    };
  });

  // 7. JS sort step (for editor sort), since cannot join for display_name
  if (body.sort_by === "editor") {
    histories = histories.sort((a, b) => {
      const aName = a.editor_user?.display_name.toLowerCase() ?? "";
      const bName = b.editor_user?.display_name.toLowerCase() ?? "";
      if (aName < bName) return body.sort_order === "asc" ? -1 : 1;
      if (aName > bName) return body.sort_order === "asc" ? 1 : -1;
      return 0;
    });
  }

  // 8. Additional search filter by editor display_name in JS
  if (body.search) {
    const searchLower = body.search.toLowerCase();
    histories = histories.filter(
      (h) =>
        h.editor_user?.display_name.toLowerCase().includes(searchLower) ||
        h.snapshot_title.toLowerCase().includes(searchLower) ||
        (!!h.snapshot_body &&
          h.snapshot_body.toLowerCase().includes(searchLower)) ||
        (!!h.snapshot_url &&
          h.snapshot_url.toLowerCase().includes(searchLower)) ||
        (!!h.snapshot_image_uri &&
          h.snapshot_image_uri.toLowerCase().includes(searchLower)) ||
        (!!h.edit_reason && h.edit_reason.toLowerCase().includes(searchLower)),
    );
  }

  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: histories,
  };
}
