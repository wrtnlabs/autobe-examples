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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionSnapshotTransformer } from "../transformers/DiscussionBoardSectionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSectionSnapshot> {
  // 1. Verify the section exists
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null, // Only active sections
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  // 2. Create snapshot record
  // Note: We use the actual section data from database, not request body,
  // as this is an audit snapshot of current state.
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.create({
      data: {
        id: v4(),
        discussion_board_section_id: props.sectionId,
        name: section.name,
        description: section.description ?? null,
        created_at: new Date(),
        snapshot_reason: null, // Not provided in request body
      },
      ...DiscussionBoardSectionSnapshotTransformer.select(),
    });
  // 3. Transform and return
  return await DiscussionBoardSectionSnapshotTransformer.transform(snapshot);
}
