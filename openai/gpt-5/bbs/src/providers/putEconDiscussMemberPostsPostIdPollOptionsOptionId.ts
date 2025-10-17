import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconDiscussMemberPostsPostIdPollOptionsOptionId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IEconDiscussPollOption.IUpdate;
}): Promise<IEconDiscussPollOption> {
  const { member, postId, optionId, body } = props;

  if (body.optionText === undefined && body.position === undefined) {
    throw new HttpException("No changes provided", 400);
  }

  try {
    const post = await MyGlobal.prisma.econ_discuss_posts.findFirstOrThrow({
      where: { id: postId, deleted_at: null },
      select: { id: true, econ_discuss_user_id: true },
    });

    const isOwner = post.econ_discuss_user_id === member.id;
    let authorized = isOwner;
    if (!authorized) {
      const [moderator, admin] = await Promise.all([
        MyGlobal.prisma.econ_discuss_moderators.findFirst({
          where: {
            user_id: member.id,
            deleted_at: null,
            user: { is: { deleted_at: null } },
          },
          select: { id: true },
        }),
        MyGlobal.prisma.econ_discuss_admins.findFirst({
          where: {
            user_id: member.id,
            deleted_at: null,
            user: { is: { deleted_at: null } },
          },
          select: { id: true },
        }),
      ]);
      authorized = Boolean(moderator || admin);
    }
    if (!authorized) {
      throw new HttpException(
        "Unauthorized: insufficient permission to update poll options",
        403,
      );
    }

    const poll = await MyGlobal.prisma.econ_discuss_polls.findFirstOrThrow({
      where: { econ_discuss_post_id: post.id, deleted_at: null },
      select: { id: true, question_type: true },
    });

    const optionSupportedTypes = new Set([
      "single_choice",
      "multiple_choice",
      "ranking",
    ]);
    if (!optionSupportedTypes.has(poll.question_type)) {
      throw new HttpException("This poll type does not support options", 400);
    }

    const option =
      await MyGlobal.prisma.econ_discuss_poll_options.findFirstOrThrow({
        where: {
          id: optionId,
          econ_discuss_poll_id: poll.id,
          deleted_at: null,
        },
        select: { id: true },
      });

    const now = toISOStringSafe(new Date());
    const updated = await MyGlobal.prisma.econ_discuss_poll_options.update({
      where: { id: option.id },
      data: {
        option_text: body.optionText ?? undefined,
        position: body.position ?? undefined,
        updated_at: now,
      },
      select: {
        id: true,
        econ_discuss_poll_id: true,
        option_text: true,
        position: true,
        created_at: true,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      pollId: updated.econ_discuss_poll_id as string & tags.Format<"uuid">,
      text: updated.option_text as string & tags.MinLength<1>,
      position: updated.position as number & tags.Type<"int32">,
      createdAt: toISOStringSafe(updated.created_at),
      updatedAt: now,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException(
          "Conflict: option text or position already exists in this poll",
          409,
        );
      }
      if (err.code === "P2025") {
        throw new HttpException("Not Found", 404);
      }
    }
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
