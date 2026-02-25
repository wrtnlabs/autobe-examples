import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilitiesCapabilityId(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  capabilityId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.IUpdate;
}): Promise<IDiscussionBoardAdministratorCapability> {
  // Verify capability exists and belongs to target administrator
  const existingCapability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findFirstOrThrow(
      {
        where: {
          id: props.capabilityId,
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
      },
    );
  // Check if update is needed
  if (
    props.body.permission_level === undefined ||
    props.body.permission_level === existingCapability.permission_level
  ) {
    // No change needed, return current capability with transformer
    const current =
      await MyGlobal.prisma.discussion_board_administrator_capabilities.findUniqueOrThrow(
        {
          where: { id: props.capabilityId },
          ...DiscussionBoardAdministratorCapabilityTransformer.select(),
        },
      );
    return await DiscussionBoardAdministratorCapabilityTransformer.transform(
      current,
    );
  }
  // Update capability with new permission level
  await MyGlobal.prisma.discussion_board_administrator_capabilities.update({
    where: { id: props.capabilityId },
    data: {
      permission_level: props.body.permission_level,
      updated_at: new Date(),
    },
  });
  // Retrieve final capability with complete transformer selection
  const finalCapability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findUniqueOrThrow(
      {
        where: { id: props.capabilityId },
        ...DiscussionBoardAdministratorCapabilityTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorCapabilityTransformer.transform(
    finalCapability,
  );
}
