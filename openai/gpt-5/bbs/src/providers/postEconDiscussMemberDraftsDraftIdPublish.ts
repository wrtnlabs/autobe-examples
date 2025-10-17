import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberDraftsDraftIdPublish(props: {
  member: MemberPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussPost> {
  const { member, draftId } = props;

  // 1) Load draft (active only)
  const draft = await MyGlobal.prisma.econ_discuss_post_drafts.findFirst({
    where: {
      id: draftId,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_user_id: true,
      econ_discuss_post_id: true,
      title: true,
      body: true,
    },
  });
  if (!draft) throw new HttpException("Not Found", 404);

  // 2) Ownership check
  if (draft.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Forbidden: You can only publish your own draft",
      403,
    );
  }

  // 3) Validate readiness (title/body required at publish time)
  if (
    draft.title === null ||
    draft.title === undefined ||
    draft.title.trim().length === 0
  ) {
    throw new HttpException("Bad Request: Draft is missing title", 400);
  }
  if (
    draft.body === null ||
    draft.body === undefined ||
    draft.body.trim().length === 0
  ) {
    throw new HttpException("Bad Request: Draft is missing body", 400);
  }
  const title: string = draft.title;
  const bodyContent: string = draft.body;

  // 4) Idempotency/Conflict: already linked to a post
  if (draft.econ_discuss_post_id !== null) {
    throw new HttpException("Conflict: Draft already published", 409);
  }

  // 5) Create post and link draft in a transaction
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const postId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.econ_discuss_posts.create({
      data: {
        id: postId,
        econ_discuss_user_id: member.id,
        title: title,
        body: bodyContent,
        created_at: now,
        updated_at: now,
        published_at: now,
      },
    });

    await tx.econ_discuss_post_drafts.update({
      where: { id: draftId },
      data: {
        econ_discuss_post_id: postId,
        updated_at: now,
      },
    });
  });

  // 6) Assemble response using prepared values
  const result: IEconDiscussPost = {
    id: postId,
    author_user_id: member.id,
    title: title,
    body: bodyContent,
    published_at: now,
    created_at: now,
    updated_at: now,
  };
  return result;
}
