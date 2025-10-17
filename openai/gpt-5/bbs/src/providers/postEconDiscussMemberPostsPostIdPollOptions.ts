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

export async function postEconDiscussMemberPostsPostIdPollOptions(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPollOption.ICreate;
}): Promise<IEconDiscussPollOption> {
  const { member, postId, body } = props;

  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true, econ_discuss_user_id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);

  if (post.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the post owner can modify this poll",
      403,
    );
  }

  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: { econ_discuss_post_id: postId, deleted_at: null },
    select: { id: true, question_type: true },
  });
  if (!poll) throw new HttpException("Poll not found for this post", 404);

  const allowedTypes = new Set(["single_choice", "multiple_choice", "ranking"]);
  if (!allowedTypes.has(poll.question_type)) {
    throw new HttpException(
      "Bad Request: This poll type does not accept options",
      400,
    );
  }

  let chosenPosition: number & tags.Type<"int32">;
  if (body.position !== undefined) {
    chosenPosition = body.position;
  } else {
    const agg = await MyGlobal.prisma.econ_discuss_poll_options.aggregate({
      where: { econ_discuss_poll_id: poll.id, deleted_at: null },
      _max: { position: true },
    });
    const next = ((agg._max.position ?? 0) + 1) as number & tags.Type<"int32">;
    chosenPosition = next;
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    await MyGlobal.prisma.econ_discuss_poll_options.create({
      data: {
        id,
        econ_discuss_poll_id: poll.id,
        option_text: body.text,
        position: chosenPosition,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException(
          "Conflict: Option text or position already exists in this poll",
          409,
        );
      }
    }
    throw new HttpException("Internal Server Error", 500);
  }

  return {
    id,
    pollId: poll.id as string & tags.Format<"uuid">,
    text: body.text,
    position: chosenPosition,
    createdAt: now,
    updatedAt: now,
  };
}
