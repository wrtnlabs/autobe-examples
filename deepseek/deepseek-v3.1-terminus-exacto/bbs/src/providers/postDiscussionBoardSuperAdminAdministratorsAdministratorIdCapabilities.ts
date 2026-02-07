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
import { DiscussionBoardAdministratorCapabilityCollector } from "../collectors/DiscussionBoardAdministratorCapabilityCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilities(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.ICreate;
}): Promise<IDiscussionBoardAdministratorCapability> {
  // Validate target administrator exists and is active
  const targetAdministrator =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: {
        id: props.administratorId,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!targetAdministrator) {
    throw new HttpException("Target administrator not found or inactive", 404);
  }
  // Check for duplicate capability assignment
  const existingCapability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findFirst(
      {
        where: {
          discussion_board_administrator_id: props.administratorId,
          capability_type: props.body.capability_type,
          deleted_at: null,
        },
      },
    );
  if (existingCapability) {
    throw new HttpException(
      `Capability '${props.body.capability_type}' is already assigned to this administrator`,
      409,
    );
  }
  // Get the admin record for the assigning super administrator
  // The collector expects discussionBoardAdmins entity, so we need to find the admin record
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.superAdmin.id, // Use superAdmin's id to find the admin record
      deleted_at: null,
    },
  });
  if (!adminRecord) {
    throw new HttpException(
      "Administrator identity for assigning super administrator not found",
      404,
    );
  }
  // Create proper entity objects for the collector
  const administratorEntity = { id: targetAdministrator.id };
  const adminEntity = { id: adminRecord.id };
  // Use the collector to properly transform and create the capability assignment
  const createInput =
    await DiscussionBoardAdministratorCapabilityCollector.collect({
      body: props.body,
      discussionBoardAdministrators: administratorEntity,
      discussionBoardAdmins: adminEntity,
    });
  const created =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.create({
      data: createInput,
      ...DiscussionBoardAdministratorCapabilityTransformer.select(),
    });
  return await DiscussionBoardAdministratorCapabilityTransformer.transform(
    created,
  );
}
