import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionFileCollector } from "../collectors/DiscussionBoardSectionFileCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionFileTransformer } from "../transformers/DiscussionBoardSectionFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdFiles(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.ICreate;
}): Promise<IDiscussionBoardSectionFile> {
  // Validate that the section exists and is accessible
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Create the file record using the collector
  const created = await MyGlobal.prisma.discussion_board_section_files.create({
    data: await DiscussionBoardSectionFileCollector.collect({
      body: props.body,
      section: { id: props.sectionId },
    }),
    ...DiscussionBoardSectionFileTransformer.select(),
  });
  // Transform and return the response
  return await DiscussionBoardSectionFileTransformer.transform(created);
}
