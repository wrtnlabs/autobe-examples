import { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionSnapshotTransformer } from "../transformers/DiscussionBoardSectionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdSnapshots(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionSnapshot> {
  // Verify section exists and capture current data in one query
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  const currentTime = toISOStringSafe(new Date());
  // Create snapshot and fetch with transformer select pattern
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_section_id: props.sectionId,
        name: section.name,
        description: section.description,
        created_at: new Date(currentTime),
        updated_at: new Date(currentTime),
        deleted_at: null,
      },
      ...DiscussionBoardSectionSnapshotTransformer.select(),
    });
  return await DiscussionBoardSectionSnapshotTransformer.transform(snapshot);
}
