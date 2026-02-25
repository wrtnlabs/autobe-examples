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
import { DiscussionBoardAdministratorCapabilityCollector } from "../collectors/DiscussionBoardAdministratorCapabilityCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilities(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorCapability.ICreate;
}): Promise<IDiscussionBoardAdministratorCapability> {
  try {
    // Validate administrator exists and is active
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: props.administratorId, deleted_at: null },
    });
    // Use collector to prepare data
    const capabilityData =
      await DiscussionBoardAdministratorCapabilityCollector.collect({
        body: props.body,
        discussionBoardAdministrators: { id: props.administratorId },
        discussionBoardSuperAdmins: { id: props.superAdmin.id },
        discussionBoardSuperAdminSessions: { id: props.superAdmin.session_id },
      });
    try {
      // Create capability assignment with automatic duplicate prevention via unique constraint
      const created =
        await MyGlobal.prisma.discussion_board_administrator_capabilities.create(
          {
            data: capabilityData,
            ...DiscussionBoardAdministratorCapabilityTransformer.select(),
          },
        );
      return await DiscussionBoardAdministratorCapabilityTransformer.transform(
        created,
      );
    } catch (error) {
      // Type guard for Prisma errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HttpException(
          "Capability assignment already exists for this administrator",
          409,
        );
      }
      throw error;
    }
  } catch (error) {
    // Type guard for Prisma errors
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Administrator not found or inactive", 404);
    }
    throw error;
  }
}
