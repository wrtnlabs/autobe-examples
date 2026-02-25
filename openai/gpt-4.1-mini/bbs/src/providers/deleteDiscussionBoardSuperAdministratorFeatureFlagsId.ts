import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdministratorFeatureFlagsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const { id, superAdministrator } = props;
    await prisma.discussion_board_feature_flags.findUniqueOrThrow({
      where: { id },
    });
    await prisma.discussion_board_feature_flags.delete({ where: { id } });
    await prisma.discussion_board_audit_logs.create({
      data: {
        id: v4(),
        event_type: "deleteFeatureFlag",
        actor_id: superAdministrator.id,
        actor_type: "superadministrator",
        target_id: id,
        target_type: "featureFlag",
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    });
  });
}
