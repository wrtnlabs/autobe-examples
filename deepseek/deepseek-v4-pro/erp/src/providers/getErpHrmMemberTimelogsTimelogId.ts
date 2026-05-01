import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimelog> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findFirstOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  const timelogAccess = await MyGlobal.prisma.erp_hrm_timelogs.findFirstOrThrow(
    {
      where: {
        id: props.timelogId,
        deleted_at: null,
        employee: {
          erp_hrm_organization_id: organizationId,
        },
      },
      select: {
        employee: {
          select: {
            erp_hrm_member_id: true,
          },
        },
      },
    },
  );
  const isOwner = timelogAccess.employee.erp_hrm_member_id === props.member.id;
  if (!isOwner) {
    const memberEmployee =
      await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
        where: {
          erp_hrm_member_id: props.member.id,
          erp_hrm_organization_id: organizationId,
        },
        select: {
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
            },
          },
        },
      });
    const { role } = memberEmployee;
    let hasViewAllTime = false;
    if (role.is_builtin && (role.name === "Owner" || role.name === "Manager")) {
      hasViewAllTime = true;
    } else {
      const permission =
        await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
          where: {
            erp_hrm_role_id: role.id,
            permission: {
              key: "time:view_all",
            },
          },
        });
      hasViewAllTime = permission !== null;
    }
    if (!hasViewAllTime) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findFirstOrThrow({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    ...ErpHrmTimelogTransformer.select(),
  });
  return await ErpHrmTimelogTransformer.transform(timelog);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTimelog> {
//   const record = await MyGlobal.prisma.erp_hrm_timelogs.findFirstOrThrow({
//     ...ErpHrmTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------