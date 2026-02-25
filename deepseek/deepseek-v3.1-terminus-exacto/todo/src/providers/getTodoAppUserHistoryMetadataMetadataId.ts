import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistoryMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppHistoryMetadatumTransformer } from "../transformers/TodoAppHistoryMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Retrieve a specific history metadata configuration by its unique identifier.
 *
 * Authentication is handled by the @UserAuth() decorator, which ensures the
 * requesting user is authenticated and valid. The user payload contains
 * necessary session information for authorization context.
 *
 * This operation returns the complete configuration details for a history metadata
 * record, including the configuration key, value, description, activation status,
 * retention policies, cleanup frequency settings, and timestamps. History metadata
 * configurations control system behavior for history tracking, retention periods,
 * and automatic cleanup operations.
 */
export async function getTodoAppUserHistoryMetadataMetadataId(props: {
  user: UserPayload;
  metadataId: string & tags.Format<"uuid">;
}): Promise<ITodoAppHistoryMetadatum> {
  try {
    const metadata =
      await MyGlobal.prisma.todo_app_history_metadata.findUniqueOrThrow({
        where: { id: props.metadataId },
        ...TodoAppHistoryMetadatumTransformer.select(),
      });
    return await TodoAppHistoryMetadatumTransformer.transform(metadata);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // Record not found - findUniqueOrThrow already handles 404
      throw error;
    }
    throw error;
  }
}
