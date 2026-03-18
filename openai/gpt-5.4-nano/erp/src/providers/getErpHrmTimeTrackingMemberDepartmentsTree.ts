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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberDepartmentsTree(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTrackingDepartment.IInvert> {
  const organizationId =
    (
      props.member as unknown as {
        organization_id?: string;
        erp_hrm_time_tracking_organization_id?: string;
      }
    ).organization_id ??
    (
      props.member as unknown as {
        erp_hrm_time_tracking_organization_id?: string;
      }
    ).erp_hrm_time_tracking_organization_id;
  if (organizationId === undefined) {
    throw new HttpException("Organization context missing", 400);
  }
  const departments =
    await MyGlobal.prisma.erp_hrm_time_tracking_departments.findMany({
      where: {
        erp_hrm_time_tracking_organization_id: organizationId,
        deleted_at: null,
      },
      orderBy: [{ name: "asc" }, { created_at: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent_department_id: true,
      },
    });
  if (departments.length === 0) {
    const emptyTimestamp = "1970-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time">;
    const emptyUuid = v4() satisfies string & tags.Format<"uuid">;
    return {
      id: emptyUuid,
      name: "",
      description: null,
      created_at: emptyTimestamp,
      updated_at: emptyTimestamp,
      deleted_at: null,
      children: [],
    } satisfies IErpHrmTimeTrackingDepartment.IInvert;
  }
  const byId: Record<
    string,
    (typeof departments)[number] & {
      children: IErpHrmTimeTrackingDepartment.IInvert[];
    }
  > = {};
  for (const d of departments) {
    byId[d.id] = {
      ...d,
      children: [],
    };
  }
  const roots: Array<(typeof departments)[number]> = [];
  for (const d of departments) {
    if (d.parent_department_id === null) {
      roots.push(d);
      continue;
    }
    const parent = byId[d.parent_department_id];
    if (parent) {
      parent.children.push({
        id: d.id,
        name: d.name,
        description: d.description ?? null,
        created_at: d.created_at.toISOString(),
        updated_at: d.updated_at.toISOString(),
        deleted_at: d.deleted_at ? d.deleted_at.toISOString() : null,
        children: [],
      } satisfies IErpHrmTimeTrackingDepartment.IInvert);
    }
  }
  const firstRoot = roots[0];
  const virtualOrSingleRoot = firstRoot
    ? {
        id: firstRoot.id,
        name: firstRoot.name,
        description: firstRoot.description ?? null,
        created_at: firstRoot.created_at.toISOString(),
        updated_at: firstRoot.updated_at.toISOString(),
        deleted_at: firstRoot.deleted_at
          ? firstRoot.deleted_at.toISOString()
          : null,
        children: byId[firstRoot.id]?.children ?? [],
      }
    : {
        id: v4() satisfies string & tags.Format<"uuid">,
        name: "",
        description: null,
        created_at: "1970-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time">,
        updated_at: "1970-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time">,
        deleted_at: null,
        children: [],
      };
  return virtualOrSingleRoot satisfies IErpHrmTimeTrackingDepartment.IInvert;
}
