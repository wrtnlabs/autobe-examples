import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardSectionTransformer } from "../transformers/EconomicPoliticalDiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalDiscussionBoardAdminSectionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IEconomicPoliticalDiscussionBoardSection.IUpdate;
}): Promise<IEconomicPoliticalDiscussionBoardSection> {
  const section =
    await MyGlobal.prisma.economic_political_discussion_board_sections.findUniqueOrThrow(
      {
        where: { id: props.id },
        select: {
          id: true,
          name: true,
          description: true,
          deleted_at: true,
        },
      },
    );
  if (props.body.name !== undefined) {
    if (props.body.name.length < 2 || props.body.name.length > 50) {
      throw new HttpException("Name must be between 2 and 50 characters", 400);
    }
    const existingSection =
      await MyGlobal.prisma.economic_political_discussion_board_sections.findFirst(
        {
          where: {
            name: { equals: props.body.name, mode: "insensitive" },
            id: { not: section.id },
            deleted_at: null,
          },
        },
      );
    if (existingSection) {
      throw new HttpException("A section with this name already exists", 400);
    }
  }
  if (props.body.description != null && props.body.description.length > 250) {
    throw new HttpException("Description must be at most 250 characters", 400);
  }
  const updateData: any = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description != null) {
    updateData.description = props.body.description;
  }
  const updatedSection =
    await MyGlobal.prisma.economic_political_discussion_board_sections.update({
      where: { id: props.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return await EconomicPoliticalDiscussionBoardSectionTransformer.transform({
    ...updatedSection,
    articles: [],
  });
}
