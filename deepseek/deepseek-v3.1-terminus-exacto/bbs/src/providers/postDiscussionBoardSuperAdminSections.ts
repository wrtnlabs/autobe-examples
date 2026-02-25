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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSections(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  // Check for existing section with the same name
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingSection) {
    throw new HttpException(
      `Section name "${props.body.name}" already exists`,
      400,
    );
  }
  // Create the section using collector and transformer
  const section = await MyGlobal.prisma.discussion_board_sections.create({
    data: await DiscussionBoardSectionCollector.collect({
      body: props.body,
      discussionBoardAdmins: { id: props.superAdmin.id },
    }),
    ...DiscussionBoardSectionTransformer.select(),
  });
  return await DiscussionBoardSectionTransformer.transform(section);
}
