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

export async function deleteDiscussionBoardSuperAdminModerationActionTypesTypeId(props: {
  superAdmin: SuperAdminPayload;
  typeId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Just attempt deletion - database will handle foreign key constraints
    await MyGlobal.prisma.discussion_board_moderation_action_types.delete({
      where: { id: props.typeId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle foreign key constraint violation
      if (error.code === "P2003") {
        throw new HttpException(
          "Cannot delete moderation action type because it is referenced by existing records",
          409,
        );
      }
      // Handle record not found (P2025)
      if (error.code === "P2025") {
        throw new HttpException("Moderation action type not found", 404);
      }
    }
    // Re-throw unexpected errors
    throw error;
  }
}
