import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionCollector } from "../collectors/DiscussionBoardSectionCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserSections(props: {
  user: UserPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  // 1. Get user from database to check permission level
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { id: true, permission_level: true },
  });
  // 2. Validate administrator privileges
  if (
    user.permission_level !== "ADMINISTRATOR" &&
    user.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException(
      "Forbidden - Administrator privileges required",
      403,
    );
  }
  // 3. Check name uniqueness
  const existing = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Section name already exists", 409);
  }
  // 4. Create section using collector
  const createInput = await DiscussionBoardSectionCollector.collect({
    body: props.body,
    discussionBoardUsers: { id: props.user.id },
  });
  // 5. Insert into database with transformer select
  const created = await MyGlobal.prisma.discussion_board_sections.create({
    data: createInput,
    ...DiscussionBoardSectionTransformer.select(),
  });
  // 6. Transform and return
  return await DiscussionBoardSectionTransformer.transform(created);
}
