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
  // Check if section name already exists among active sections
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
  // Create new section using Collector for data transformation
  const created = await MyGlobal.prisma.discussion_board_sections.create({
    data: await DiscussionBoardSectionCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardSectionTransformer.select(),
  });
  // Transform database result to DTO
  return await DiscussionBoardSectionTransformer.transform(created);
}
