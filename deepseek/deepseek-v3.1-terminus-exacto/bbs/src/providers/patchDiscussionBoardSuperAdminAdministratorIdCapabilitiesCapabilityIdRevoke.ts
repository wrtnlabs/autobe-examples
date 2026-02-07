import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
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

export async function patchDiscussionBoardSuperAdminAdministratorIdCapabilitiesCapabilityIdRevoke(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  capabilityId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorCapability.IUpdate> {
  // Verify the capability exists, is active, and belongs to the specified administrator
  const capability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findFirst(
      {
        where: {
          id: props.capabilityId,
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
      },
    );
  if (!capability) {
    throw new HttpException(
      "Capability assignment not found or already revoked",
      404,
    );
  }
  // Perform soft deletion by setting deleted_at
  const updatedCapability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.update({
      where: { id: props.capabilityId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Return only the fields defined in IUpdate DTO
  return {
    capability_type: updatedCapability.capability_type,
    permission_level: updatedCapability.permission_level,
  };
}
