import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionDeletionAtInvertTransformer } from "../transformers/DiscussionBoardSectionDeletionAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSectionsSectionIdDeletions(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionDeletion.IInvert> {
  // Retrieve the deletion record with proper joins using transformer
  const deletionRecord =
    await MyGlobal.prisma.discussion_board_section_deletions.findFirst({
      where: { discussion_board_section_id: props.sectionId },
      ...DiscussionBoardSectionDeletionAtInvertTransformer.select(),
    });
  if (!deletionRecord) {
    throw new HttpException(
      "Deletion record not found for the specified section",
      404,
    );
  }
  // Transform the database record to DTO format
  return await DiscussionBoardSectionDeletionAtInvertTransformer.transform(
    deletionRecord,
  );
}
