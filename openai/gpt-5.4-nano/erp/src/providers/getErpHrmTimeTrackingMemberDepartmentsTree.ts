import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingDepartmentAtInvertTransformer } from "../transformers/ErpHrmTimeTrackingDepartmentAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberDepartmentsTree(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTrackingDepartment.IInvert> {
  const orgId = props.member.session_id;
  const rows = await MyGlobal.prisma.erp_hrm_time_tracking_departments.findMany(
    {
      where: {
        erp_hrm_time_tracking_organization_id: orgId,
        deleted_at: null,
      },
      orderBy: [{ name: "asc" }, { created_at: "asc" }],
      select: ErpHrmTimeTrackingDepartmentAtInvertTransformer.select().select,
    },
  );
  const byId: Record<
    string & tags.Format<"uuid">,
    IErpHrmTimeTrackingDepartment.IInvert
  > = {};
  for (const row of rows) {
    const createdAt = toISOStringSafe(row.created_at);
    const updatedAt = toISOStringSafe(row.updated_at);
    const deletedAt = row.deleted_at ? toISOStringSafe(row.deleted_at) : null;
    const node: IErpHrmTimeTrackingDepartment.IInvert = {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      created_at: createdAt satisfies string as string &
        tags.Format<"date-time">,
      updated_at: updatedAt satisfies string as string &
        tags.Format<"date-time">,
      deleted_at: deletedAt
        ? (deletedAt satisfies string as string & tags.Format<"date-time">)
        : null,
      children: [],
    };
    byId[node.id] = node;
  }
  const roots: IErpHrmTimeTrackingDepartment.IInvert[] = [];
  for (const row of rows) {
    const node = byId[row.id];
    const parentId = row.parentDepartment?.id ?? null;
    if (parentId === null) {
      roots.push(node);
    } else {
      const parent = byId[parentId as string & tags.Format<"uuid">];
      if (parent) {
        parent.children = [...parent.children, node];
      } else {
        roots.push(node);
      }
    }
  }
  if (roots.length === 1) return roots[0];
  const syntheticId = v4() as string & tags.Format<"uuid">;
  const nowIso: string & tags.Format<"date-time"> = "2026-03-31T07:17:27.622Z";
  const synthetic: IErpHrmTimeTrackingDepartment.IInvert = {
    id: syntheticId,
    name: "",
    description: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    children: roots,
  };
  return synthetic;
}
