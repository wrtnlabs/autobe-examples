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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorSections(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  if (props.body.name.trim().length === 0) {
    throw new HttpException("Section name must not be empty", 400);
  }
  const existing = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { name: props.body.name },
  });
  if (existing !== null) {
    throw new HttpException("Section name already exists", 400);
  }
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.discussion_board_sections.create({
    data: {
      id,
      name: props.body.name,
      description: props.body.description,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.discussion_board_section_admin_logs.create({
    data: {
      id: v4(),
      action_type: "create",
      administrator_id: props.superAdministrator.id,
      section_id: id,
      note: null,
      created_at: now,
      updated_at: now,
    },
  });
  const record =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(record);
}
