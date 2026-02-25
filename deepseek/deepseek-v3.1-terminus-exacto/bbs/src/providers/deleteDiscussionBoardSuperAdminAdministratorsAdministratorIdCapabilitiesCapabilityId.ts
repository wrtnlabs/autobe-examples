import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilitiesCapabilityId(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  capabilityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify administrator exists and is active
  await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
    where: {
      id: props.administratorId,
      deleted_at: null,
      is_active: true,
    },
    select: { id: true },
  });
  // Verify capability exists, belongs to this administrator, and is not already deleted
  const capability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findUniqueOrThrow(
      {
        where: {
          id: props.capabilityId,
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
      },
    );
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_administrator_capabilities.update({
    where: { id: props.capabilityId },
    data: {
      deleted_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
