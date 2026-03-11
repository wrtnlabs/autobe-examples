import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
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
    await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...EconomicPoliticalBoardSectionTransformer.select(),
    });
  if (existingSection.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  if (
    props.body.name !== undefined &&
    props.body.name !== existingSection.name
  ) {
    const duplicateSection =
      await MyGlobal.prisma.economic_political_board_sections.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.sectionId },
          deleted_at: null,
        },
      });
    if (duplicateSection !== null) {
      throw new HttpException("Section name already exists", 409);
    }
  }
  const updated =
    await MyGlobal.prisma.economic_political_board_sections.update({
      where: { id: props.sectionId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: new Date(),
      },
      ...EconomicPoliticalBoardSectionTransformer.select(),
    });
  return await EconomicPoliticalBoardSectionTransformer.transform(updated);
}
