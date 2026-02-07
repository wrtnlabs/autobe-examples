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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSections(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  // Check for existing section with same name
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingSection) {
    throw new HttpException(
      `Section with name "${props.body.name}" already exists`,
      409,
    );
  }
  // Get the full admin entity for collector reference
  const adminEntity =
    await MyGlobal.prisma.discussion_board_super_admins.findUnique({
      where: { id: props.superAdmin.id },
    });
  if (!adminEntity) {
    throw new HttpException("Administrator not found", 404);
  }
  // Use collector to prepare data
  const collectedData = await DiscussionBoardSectionCollector.collect({
    body: props.body,
    discussionBoardAdmins: {
      id: adminEntity.id,
      type: "super_admin",
    } as IEntity,
  });
  // Create the section with transformer select
  const created = await MyGlobal.prisma.discussion_board_sections.create({
    data: collectedData,
    ...DiscussionBoardSectionTransformer.select(),
  });
  // Transform to response DTO
  return await DiscussionBoardSectionTransformer.transform(created);
}
