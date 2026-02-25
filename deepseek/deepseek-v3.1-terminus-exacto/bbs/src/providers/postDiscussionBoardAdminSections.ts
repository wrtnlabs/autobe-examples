import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionCollector } from "../collectors/DiscussionBoardSectionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSections(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  // Validate section name length from analysis files (2-50 characters)
  if (props.body.name.length < 2 || props.body.name.length > 50) {
    throw new HttpException(
      "Section name must be between 2 and 50 characters",
      400,
    );
  }
  // Validate section name uniqueness
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: { name: props.body.name, deleted_at: null },
    });
  if (existingSection) {
    throw new HttpException("Section name already exists", 400);
  }
  // Validate description length from analysis files (10-500 characters)
  if (
    props.body.description.length < 10 ||
    props.body.description.length > 500
  ) {
    throw new HttpException(
      "Section description must be between 10 and 500 characters",
      400,
    );
  }
  // Validate status value if provided
  if (
    props.body.status &&
    !["active", "inactive", "archived"].includes(props.body.status)
  ) {
    throw new HttpException(
      "Status must be one of: active, inactive, archived",
      400,
    );
  }
  // Use collector for create data preparation
  const createData = await DiscussionBoardSectionCollector.collect({
    body: props.body,
    discussionBoardAdmins: { id: props.admin.id },
  });
  // Create the section
  const created = await MyGlobal.prisma.discussion_board_sections.create({
    data: createData,
    ...DiscussionBoardSectionTransformer.select(),
  });
  // Transform and return
  return await DiscussionBoardSectionTransformer.transform(created);
}
