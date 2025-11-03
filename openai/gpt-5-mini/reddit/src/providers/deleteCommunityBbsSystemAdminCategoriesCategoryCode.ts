import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function deleteCommunityBbsSystemAdminCategoriesCategoryCode(props: {
  systemAdmin: SystemadminPayload;
  categoryCode: string;
}): Promise<void> {
  const { systemAdmin, categoryCode } = props;

  // Ensure the acting system admin still exists and is active
  const adminRecord =
    await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
      where: { id: systemAdmin.id },
      select: { id: true, deleted_at: true },
    });
  if (!adminRecord || adminRecord.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }

  // Fetch the target category (must exist and not already deleted)
  const category =
    await MyGlobal.prisma.community_bbs_community_categories.findFirst({
      where: { code: categoryCode, deleted_at: null },
      select: { id: true, code: true, parent_id: true },
    });
  if (!category) {
    throw new HttpException("Not Found", 404);
  }

  // Determine platform policy for category deletion. Default to 'prevent'.
  const policyRow =
    await MyGlobal.prisma.community_bbs_system_settings.findFirst({
      where: { key: "community.categories.delete_policy" },
      select: { value: true },
    });
  const policy = policyRow?.value ?? "prevent";

  const now = toISOStringSafe(new Date());

  // Find any active direct children
  const directChildren =
    await MyGlobal.prisma.community_bbs_community_categories.findMany({
      where: { parent_id: category.id, deleted_at: null },
      select: { id: true },
    });

  // If policy prevents deletion and there are blocking children -> conflict
  if (policy === "prevent" && directChildren.length > 0) {
    const blocking = directChildren.map((c) => c.id);
    throw new HttpException(
      `Conflict: active child categories block deletion: ${blocking.join(",")}`,
      409,
    );
  }

  // Decide affected ids and perform DB updates atomically
  let affectedCategoryIds: string[] = [category.id];

  if (policy === "reassign" && directChildren.length > 0) {
    // Promote children to the deleted category's parent (could be null)
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_bbs_community_categories.updateMany({
        where: { parent_id: category.id, deleted_at: null },
        data: { parent_id: category.parent_id ?? null, updated_at: now },
      }),
      MyGlobal.prisma.community_bbs_community_categories.update({
        where: { id: category.id },
        data: { deleted_at: now, updated_at: now },
      }),
    ]);

    affectedCategoryIds = [category.id, ...directChildren.map((c) => c.id)];
  } else if (policy === "cascade") {
    // Collect all descendants by breadth-first traversal
    const toDelete: string[] = [category.id];
    let queue: string[] = [category.id];

    while (queue.length > 0) {
      const children =
        await MyGlobal.prisma.community_bbs_community_categories.findMany({
          where: { parent_id: { in: queue }, deleted_at: null },
          select: { id: true },
        });
      const ids = children.map((c) => c.id);
      if (ids.length === 0) break;
      toDelete.push(...ids);
      queue = ids;
    }

    affectedCategoryIds = toDelete;

    // Soft-delete all collected categories in a single operation
    await MyGlobal.prisma.community_bbs_community_categories.updateMany({
      where: { id: { in: toDelete } },
      data: { deleted_at: now, updated_at: now },
    });
  } else {
    // Default: soft-delete only the single category (no children or policy allowed)
    await MyGlobal.prisma.community_bbs_community_categories.update({
      where: { id: category.id },
      data: { deleted_at: now, updated_at: now },
    });
  }

  // Record immutable audit log for this operation
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      entity: "category",
      action: "delete_category",
      payload: JSON.stringify({
        category_id: category.id,
        code: category.code,
        policy,
        affected_category_ids: affectedCategoryIds,
      }),
      created_at: now,
      updated_at: now,
    },
  });

  return;
}
