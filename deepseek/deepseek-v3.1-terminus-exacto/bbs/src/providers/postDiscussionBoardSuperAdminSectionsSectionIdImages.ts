import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionImageCollector } from "../collectors/DiscussionBoardSectionImageCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionImageTransformer } from "../transformers/DiscussionBoardSectionImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdImages(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.ICreate;
}): Promise<IDiscussionBoardSectionImage> {
  // Verify section exists and is active
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  if (section.status !== "active") {
    throw new HttpException("Section is not active", 400);
  }
  // Create section image using collector
  const created = await MyGlobal.prisma.discussion_board_section_images.create({
    data: await DiscussionBoardSectionImageCollector.collect({
      body: props.body,
      discussionBoardSections: { id: props.sectionId },
    }),
    ...DiscussionBoardSectionImageTransformer.select(),
  });
  return await DiscussionBoardSectionImageTransformer.transform(created);
}
