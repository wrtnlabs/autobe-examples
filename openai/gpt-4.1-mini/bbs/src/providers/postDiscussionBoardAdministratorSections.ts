import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionCollector } from "../collectors/DiscussionBoardSectionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorSections(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  // Validate uniqueness of the section name
  const existing = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { name: props.body.name },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException(
      `Section name '${props.body.name}' already exists.`,
      409,
    );
  }
  // Collect data for creation
  const data = await DiscussionBoardSectionCollector.collect({
    body: props.body,
  });
  // Create the new section
  const section = await MyGlobal.prisma.discussion_board_sections.create({
    data,
    ...DiscussionBoardSectionTransformer.select(),
  });
  // Generate timestamps as ISO strings
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Generate admin log id
  const logId = v4() as string & tags.Format<"uuid">;
  // Insert admin log for the creation
  await MyGlobal.prisma.discussion_board_section_admin_logs.create({
    data: {
      id: logId,
      action_type: "create",
      note: null,
      administrator: { connect: { id: props.administrator.id } },
      section: { connect: { id: section.id } },
      created_at: now,
      updated_at: now,
    },
  });
  // Transform and return result
  return await DiscussionBoardSectionTransformer.transform(section);
}
