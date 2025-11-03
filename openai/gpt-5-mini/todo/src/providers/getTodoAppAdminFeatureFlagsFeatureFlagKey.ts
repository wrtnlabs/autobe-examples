import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppFeatureFlag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminFeatureFlagsFeatureFlagKey(props: {
  admin: AdminPayload;
  featureFlagKey: string;
}): Promise<ITodoAppFeatureFlag> {
  const { admin, featureFlagKey } = props;

  try {
    const record = await MyGlobal.prisma.todo_app_feature_flags.findUnique({
      where: { key: featureFlagKey },
    });

    if (record === null) {
      throw new HttpException("Not Found", 404);
    }

    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "feature_flag_view",
        target_type: "feature_flag",
        target_id: record.id,
        details: `Admin viewed feature flag: ${featureFlagKey}`,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: record.id,
      key: record.key,
      enabled: record.enabled,
      rolloutPercentage:
        record.rollout_percentage === null ? null : record.rollout_percentage,
      description: record.description ?? null,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;

    const now = toISOStringSafe(new Date());

    try {
      await MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin?.id ?? null,
          todo_app_admin_session_id: admin?.session_id ?? null,
          event_type: "feature_flag_view_error",
          target_type: "feature_flag",
          target_id: null,
          details: err instanceof Error ? err.message : String(err),
          created_at: now,
          updated_at: now,
        },
      });
    } catch {
      // swallow audit logging error to preserve original error handling
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
