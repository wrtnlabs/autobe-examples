import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberPostsPostIdBookmarks(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPostBookmark.ICreate;
}): Promise<void> {
  const { member, postId, body } = props;

  // Verify post exists and is active (not soft-deleted)
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (post === null) throw new HttpException("Not Found", 404);

  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.econ_discuss_post_bookmarks.create({
      data: {
        id: v4(),
        econ_discuss_user_id: member.id,
        econ_discuss_post_id: postId,
        note: body.note ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      await MyGlobal.prisma.econ_discuss_post_bookmarks.updateMany({
        where: {
          econ_discuss_user_id: member.id,
          econ_discuss_post_id: postId,
        },
        data: {
          note: body.note === undefined ? undefined : body.note,
          deleted_at: null,
          updated_at: now,
        },
      });
      return;
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
