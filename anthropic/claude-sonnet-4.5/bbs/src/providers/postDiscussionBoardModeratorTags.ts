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

export async function postDiscussionBoardModeratorTags(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  const { moderator, body } = props;

  // Normalize tag name to lowercase for consistency
  const normalizedName = body.name.toLowerCase().trim();

  // Generate URL-friendly slug from normalized name
  const slug = normalizedName
    .replace(/\\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Validate slug is not empty after normalization
  if (slug.length === 0) {
    throw new HttpException(
      "Tag name must contain at least one alphanumeric character",
      400,
    );
  }

  // Check for duplicate name or slug
  const existingTag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      OR: [{ name: normalizedName }, { slug: slug }],
    },
  });

  if (existingTag) {
    throw new HttpException("Tag with this name or slug already exists", 409);
  }

  // Prepare timestamp once for reuse
  const now = toISOStringSafe(new Date());

  // Create the tag with all required fields
  const created = await MyGlobal.prisma.discussion_board_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: normalizedName,
      slug: slug,
      created_at: now,
      updated_at: now,
    },
  });

  // Return using prepared values
  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    slug: created.slug,
    created_at: now,
    updated_at: now,
  };
}
