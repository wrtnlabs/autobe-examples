import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilitiesCapabilityId(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  capabilityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction for atomic operation
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // First verify the administrator exists
    const administrator =
      await prisma.discussion_board_administrators.findFirst({
        where: {
          id: props.administratorId,
          deleted_at: null,
        },
      });
    if (!administrator) {
      throw new HttpException("Administrator not found", 404);
    }
    // Verify capability exists and belongs to the specified administrator
    const capability =
      await prisma.discussion_board_administrator_capabilities.findFirst({
        where: {
          id: props.capabilityId,
          administrator: { id: props.administratorId },
          deleted_at: null,
        },
      });
    if (!capability) {
      throw new HttpException(
        "Capability assignment not found for this administrator",
        404,
      );
    }
    // Perform soft delete by setting deleted_at timestamp
    const now = toISOStringSafe(new Date());
    await prisma.discussion_board_administrator_capabilities.update({
      where: { id: props.capabilityId },
      data: {
        deleted_at: now,
      },
    });
  });
}
