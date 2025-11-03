import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function putCommunityBbsSystemAdminCategoriesCategoryCode(props: {
  systemAdmin: SystemadminPayload;
  categoryCode: string;
  body: ICommunityBbsCommunityCategory.IUpdate;
}): Promise<ICommunityBbsCommunityCategory> {
  const { systemAdmin, categoryCode, body } = props;

  // Load existing category (must be active)
  const existing =
    await MyGlobal.prisma.community_bbs_community_categories.findFirstOrThrow({
      where: { code: categoryCode, deleted_at: null },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        display_order: true,
        parent_id: true,
        created_by_system_admin_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  // Resolve parent if provided (and not null)
  let parentRecord: { id: string; parent_id: string | null } | null = null;
  if (body.parent_code !== undefined && body.parent_code !== null) {
    parentRecord =
      await MyGlobal.prisma.community_bbs_community_categories.findFirstOrThrow(
        {
          where: { code: body.parent_code, deleted_at: null },
          select: { id: true, parent_id: true },
        },
      );

    if (parentRecord.id === existing.id) {
      throw new HttpException(
        "Invalid parent: cannot set category as its own parent",
        400,
      );
    }

    // Cycle detection: walk ancestors of the candidate parent
    let cursor: { id: string; parent_id: string | null } | null = parentRecord;
    while (cursor) {
      if (cursor.id === existing.id) {
        throw new HttpException(
          "Invalid parent: cycle detected in category hierarchy",
          400,
        );
      }
      if (!cursor.parent_id) break;
      const next: { id: string; parent_id: string | null } | null =
        await MyGlobal.prisma.community_bbs_community_categories.findUnique({
          where: { id: cursor.parent_id },
          select: { id: true, parent_id: true },
        });
      if (!next) break;
      cursor = next;
    }
  }

  const now = toISOStringSafe(new Date());

  // Compute changes for audit
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (body.title !== undefined && body.title !== existing.title)
    changes.title = { from: existing.title, to: body.title };
  if (
    body.description !== undefined &&
    body.description !== existing.description
  )
    changes.description = { from: existing.description, to: body.description };
  if (
    body.display_order !== undefined &&
    body.display_order !== existing.display_order
  )
    changes.display_order = {
      from: existing.display_order,
      to: body.display_order,
    };
  if (body.parent_code !== undefined) {
    const newParentId =
      body.parent_code === null ? null : (parentRecord?.id ?? null);
    if (newParentId !== existing.parent_id)
      changes.parent_id = { from: existing.parent_id, to: newParentId };
  }

  try {
    await MyGlobal.prisma.community_bbs_community_categories.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.display_order !== undefined && {
          display_order: body.display_order,
        }),
        ...(body.parent_code !== undefined && {
          parent_id: body.parent_code === null ? null : parentRecord!.id,
        }),
        updated_at: now,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException("Conflict: unique constraint violation", 409);
    }
    throw e;
  }

  // Create audit log entry
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      entity: "community_bbs_community_categories",
      action: "update",
      payload: JSON.stringify({ code: existing.code, changes }),
      created_at: now,
      updated_at: now,
    },
  });

  // Reload updated category
  const updated =
    await MyGlobal.prisma.community_bbs_community_categories.findUniqueOrThrow({
      where: { id: existing.id },
    });

  // Build parent summary (shallow)
  let parentSummary:
    | ICommunityBbsCommunityCategory.ISummary
    | null
    | undefined = undefined;
  if (updated.parent_id) {
    const p =
      await MyGlobal.prisma.community_bbs_community_categories.findUnique({
        where: { id: updated.parent_id },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          display_order: true,
          parent_id: true,
          created_at: true,
          updated_at: true,
        },
      });
    if (p) {
      parentSummary = {
        id: p.id,
        code: p.code,
        title: p.title,
        description: p.description ?? null,
        display_order: p.display_order ?? undefined,
        parent: null,
        created_at: toISOStringSafe(p.created_at),
        updated_at: toISOStringSafe(p.updated_at),
      };
    }
  }

  // Build created_by summary
  let createdBySummary: ICommunityBbsSystemAdmin.ISummary | null | undefined =
    undefined;
  if (updated.created_by_system_admin_id) {
    const admin = await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
      where: { id: updated.created_by_system_admin_id },
      select: {
        id: true,
        display_name: true,
        is_super_admin: true,
        created_at: true,
      },
    });
    if (admin) {
      createdBySummary = {
        id: admin.id,
        display_name: admin.display_name ?? null,
        is_super_admin: admin.is_super_admin ?? undefined,
        created_at: admin.created_at ? toISOStringSafe(admin.created_at) : null,
      };
    }
  }

  return {
    id: updated.id,
    code: updated.code,
    title: updated.title,
    description: updated.description ?? null,
    display_order: updated.display_order,
    parent: parentSummary ?? undefined,
    created_by: createdBySummary ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
