import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorTagsTagSlug(props: {
  moderator: ModeratorPayload;
  tagSlug: string;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  const { moderator, tagSlug, body } = props;

  const existingTag =
    await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
      where: { slug: tagSlug },
    });

  if (body.name !== undefined) {
    const normalizedName = body.name.toLowerCase();

    if (normalizedName !== existingTag.name) {
      const duplicate = await MyGlobal.prisma.discussion_board_tags.findUnique({
        where: { name: normalizedName },
      });

      if (duplicate !== null) {
        throw new HttpException("Tag with this name already exists", 409);
      }

      const generatedSlug = normalizedName
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const updated = await MyGlobal.prisma.discussion_board_tags.update({
        where: { id: existingTag.id },
        data: {
          name: normalizedName,
          slug: generatedSlug,
          updated_at: toISOStringSafe(new Date()),
        },
      });

      return {
        id: updated.id as string & tags.Format<"uuid">,
        name: updated.name,
        slug: updated.slug,
        created_at: toISOStringSafe(updated.created_at),
        updated_at: toISOStringSafe(updated.updated_at),
      };
    }
  }

  const updated = await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: existingTag.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    slug: updated.slug,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
