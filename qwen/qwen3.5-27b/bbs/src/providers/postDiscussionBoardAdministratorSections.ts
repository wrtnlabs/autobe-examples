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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorSections(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  // Check if section name already exists (unique constraint)
  const existing = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Section name already exists", 409);
  }
  // Create the section using collector and transformer
  const created = await MyGlobal.prisma.discussion_board_sections.create({
    data: await DiscussionBoardSectionCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardSectionTransformer.select(),
  });
  return await DiscussionBoardSectionTransformer.transform(created);
}
