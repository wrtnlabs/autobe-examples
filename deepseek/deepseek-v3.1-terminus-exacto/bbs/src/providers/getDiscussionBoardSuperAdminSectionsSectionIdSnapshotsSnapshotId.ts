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

export async function getDiscussionBoardSuperAdminSectionsSectionIdSnapshotsSnapshotId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionSnapshot> {
  // Verify snapshot exists and belongs to specified section
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        section: { id: props.sectionId }, // Ensure snapshot belongs to this section
      },
      ...DiscussionBoardSectionSnapshotTransformer.select(),
    });
  return await DiscussionBoardSectionSnapshotTransformer.transform(snapshot);
}
