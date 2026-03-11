import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionSnapshotTransformer } from "../transformers/DiscussionBoardSectionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSectionsSectionIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionSnapshot> {
  // First verify the section exists and admin has access to it
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  // Retrieve the specific snapshot belonging to this section
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        discussion_board_section_id: props.sectionId,
      },
      ...DiscussionBoardSectionSnapshotTransformer.select(),
    });
  // Transform database record to DTO
  return await DiscussionBoardSectionSnapshotTransformer.transform(snapshot);
}
