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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserSectionsSectionId(props: {
  registeredUser: RegistereduserPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Verify section exists
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  // Validate unique name if name provided
  if (props.body.name !== undefined) {
    const duplicateSection =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: { name: props.body.name, id: { not: props.sectionId } },
      });
    if (duplicateSection) {
      throw new HttpException("Conflict: section name must be unique", 409);
    }
  }
  // Prepare update data with immutability
  const updatedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const updateData: Partial<{
    name: string;
    description: string;
    updated_at: string & tags.Format<"date-time">;
  }> = {
    updated_at: updatedAt,
  };
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  // Update section
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: updateData,
  });
  // Refetch updated section including relations
  const updatedSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  // Return mapped response
  return await DiscussionBoardSectionTransformer.transform(updatedSection);
}
