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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionDeletionTransformer } from "../transformers/DiscussionBoardSectionDeletionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSectionsSectionIdDeletions(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionDeletion> {
  // Verify super admin has authorization (handled by decorator)
  // No additional authorization check needed as decorator already verified superAdmin identity
  // First verify the section exists
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  // findUniqueOrThrow automatically throws 404 if not found
  // Query the deletion record with transformer
  const deletion =
    await MyGlobal.prisma.discussion_board_section_deletions.findUniqueOrThrow({
      where: { discussion_board_section_id: props.sectionId },
      ...DiscussionBoardSectionDeletionTransformer.select(),
    });
  // Transform and return the result
  return await DiscussionBoardSectionDeletionTransformer.transform(deletion);
}
