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
import { DiscussionBoardSectionSnapshotAtArchiveTransformer } from "../transformers/DiscussionBoardSectionSnapshotAtArchiveTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSectionsSectionIdSnapshotsSnapshotId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionSnapshot.IArchive> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_section_snapshots.findUnique({
      where: { id: props.snapshotId },
      ...DiscussionBoardSectionSnapshotAtArchiveTransformer.select(),
    });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  if (snapshot.section.id !== props.sectionId) {
    throw new HttpException(
      "Snapshot does not belong to the specified section",
      404,
    );
  }
  return await DiscussionBoardSectionSnapshotAtArchiveTransformer.transform(
    snapshot,
  );
}
