import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardSectionTransformer } from "../transformers/EconomicPoliticalBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardSection.IUpdate;
}): Promise<IEconomicPoliticalBoardSection> {
  const existingSection =
    await MyGlobal.prisma.economic_political_board_sections.findUnique({
      where: { id: props.sectionId },
      select: { id: true, deleted_at: true },
    });
  if (existingSection === null || existingSection.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  const updateData: {
    name?: string;
    description?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    const otherSection =
      await MyGlobal.prisma.economic_political_board_sections.findFirst({
        where: {
          name: props.body.name,
          AND: [
            {
              NOT: {
                id: props.sectionId,
              },
            },
          ],
        },
        select: { id: true },
      });
    if (otherSection !== null) {
      throw new HttpException("Section name already exists", 409);
    }
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  const updated =
    await MyGlobal.prisma.economic_political_board_sections.update({
      where: { id: props.sectionId },
      data: updateData,
      ...EconomicPoliticalBoardSectionTransformer.select(),
    });
  return await EconomicPoliticalBoardSectionTransformer.transform(updated);
}
