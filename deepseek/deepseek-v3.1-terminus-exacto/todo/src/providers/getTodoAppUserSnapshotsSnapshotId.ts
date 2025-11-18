import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationSnapshot";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserSnapshotsSnapshotId(props: {
  user: UserPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ITodoAppConfigurationSnapshot> {
  // Find the configuration snapshot by ID
  const snapshot =
    await MyGlobal.prisma.todo_app_configuration_snapshots.findUnique({
      where: { id: props.snapshotId },
    });

  // If snapshot not found, throw 404 error
  if (!snapshot) {
    throw new HttpException("Configuration snapshot not found", 404);
  }

  // Return the snapshot with proper date formatting
  return {
    id: snapshot.id,
    todo_app_configuration_id: snapshot.todo_app_configuration_id,
    config_key: snapshot.config_key,
    name: snapshot.name,
    description: snapshot.description,
    data_type: snapshot.data_type,
    default_value: snapshot.default_value,
    validation_rules: snapshot.validation_rules ?? undefined,
    category: snapshot.category,
    is_sensitive: snapshot.is_sensitive,
    is_required: snapshot.is_required,
    version: snapshot.version,
    snapshot_reason: snapshot.snapshot_reason,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
