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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminPostsPostIdEditHistories(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostEditHistory.IRequest;
}): Promise<IPageICommunityPlatformPostEditHistory> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);

  const page = Number(props.body.page);
  const pageSize = Number(props.body.page_size);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const filter: any = { community_platform_post_id: props.postId };
  const search = props.body.search?.trim();
  if (search) {
    const matchedEditors =
      await MyGlobal.prisma.community_platform_users.findMany({
        where: { display_name: { contains: search } },
        select: { id: true },
      });
    const matchedEditorIds = matchedEditors.map((u) => u.id);
    filter.OR = [
      { snapshot_title: { contains: search } },
      { snapshot_body: { contains: search } },
      { snapshot_url: { contains: search } },
      { snapshot_image_uri: { contains: search } },
      { edit_reason: { contains: search } },
      matchedEditorIds.length > 0
        ? { community_platform_user_id: { in: matchedEditorIds } }
        : undefined,
    ].filter(Boolean);
  }

  let orderBy: any;
  const sortOrder: "asc" | "desc" =
    props.body.sort_order === "asc" ? "asc" : "desc";
  switch (props.body.sort_by) {
    case "edited_at":
      orderBy = { created_at: sortOrder };
      break;
    case "editor":
      orderBy = { community_platform_user_id: sortOrder };
      break;
    case "reason":
      orderBy = { edit_reason: sortOrder };
      break;
    default:
      orderBy = { created_at: "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_edit_histories.findMany({
      where: filter,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_post_edit_histories.count({
      where: filter,
    }),
  ]);

  const userIdsSet = new Set<string>(
    rows.map((row) => row.community_platform_user_id),
  );
  const userIds = Array.from(userIdsSet);
  const editors = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: userIds } },
    select: { id: true, display_name: true },
  });
  const editorsMap = new Map<string, { id: string; display_name: string }>(
    editors.map((u) => [u.id, u]),
  );

  const data = rows.map((h) => ({
    id: h.id,
    community_platform_post_id: h.community_platform_post_id,
    community_platform_user_id: h.community_platform_user_id,
    editor_user: editorsMap.has(h.community_platform_user_id)
      ? {
          id: editorsMap.get(h.community_platform_user_id)!.id,
          display_name: editorsMap.get(h.community_platform_user_id)!
            .display_name,
        }
      : undefined,
    edit_type: h.edit_type,
    snapshot_title: h.snapshot_title,
    snapshot_body: h.snapshot_body ?? null,
    snapshot_url: h.snapshot_url ?? null,
    snapshot_image_uri: h.snapshot_image_uri ?? null,
    edit_reason: h.edit_reason ?? null,
    created_at: toISOStringSafe(h.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
