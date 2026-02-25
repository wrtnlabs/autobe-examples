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

export async function patchDiscussionBoardSuperAdministratorSectionsSectionId(props: {
  superAdministrator: SuperadministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Validate existence
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Check name uniqueness if name is provided
  if (props.body.name !== undefined) {
    const duplicateCount =
      await MyGlobal.prisma.discussion_board_sections.count({
        where: { name: props.body.name, NOT: { id: props.sectionId } },
      });
    if (duplicateCount > 0) {
      throw new HttpException(
        `Section name '${props.body.name}' already exists.`,
        409,
      );
    }
  }
  // Prepare data to update
  const currentIsoDateTime = toISOStringSafe(new Date());
  const dataToUpdate: Partial<Prisma.discussion_board_sectionsUpdateInput> = {
    updated_at: currentIsoDateTime,
  };
  if (props.body.name !== undefined) {
    dataToUpdate.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    dataToUpdate.description = props.body.description;
  }
  // Update
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: dataToUpdate,
  });
  // Fetch updated record
  const updatedSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(updatedSection);
}
