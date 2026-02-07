import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilitiesCapabilityId(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  capabilityId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.IUpdate;
}): Promise<IDiscussionBoardAdministratorCapability> {
  // Verify capability exists and belongs to specified administrator
  const existingCapability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findUnique(
      {
        where: {
          id: props.capabilityId,
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
        ...DiscussionBoardAdministratorCapabilityTransformer.select(),
      },
    );
  if (!existingCapability) {
    throw new HttpException("Capability assignment not found", 404);
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_administrator_capabilitiesUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  // Update capability_type if provided
  if (props.body.capability_type !== undefined) {
    updateData.capability_type = props.body.capability_type;
  }
  // Update permission_level if provided
  if (props.body.permission_level !== undefined) {
    updateData.permission_level = props.body.permission_level;
  }
  // Perform update
  const updatedCapability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.update({
      where: { id: props.capabilityId },
      data: updateData,
      ...DiscussionBoardAdministratorCapabilityTransformer.select(),
    });
  return await DiscussionBoardAdministratorCapabilityTransformer.transform(
    updatedCapability,
  );
}
