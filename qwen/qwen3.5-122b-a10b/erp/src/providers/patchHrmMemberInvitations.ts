import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployeeInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeInvitationAtSummaryTransformer } from "../transformers/HrmEmployeeInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmEmployeeInvitation.IRequest;
}): Promise<IPageIHrmEmployeeInvitation.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You're not enrolled in any organization", 403);
  }
  const whereInput: Prisma.hrm_employee_invitationsWhereInput = {
    deleted_at: null,
    organization_id: employee.organization_id,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.email !== undefined && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.expires_at_from !== undefined && {
      expires_at: {
        gte: new Date(props.body.expires_at_from),
      },
    }),
    ...(props.body.expires_at_to !== undefined && {
      expires_at: {
        lte: new Date(props.body.expires_at_to),
      },
    }),
  } satisfies Prisma.hrm_employee_invitationsWhereInput;
  const orderByInput: Prisma.hrm_employee_invitationsOrderByWithRelationInput =
    props.body.sort_by !== undefined
      ? {
          [props.body.sort_by]: props.body.sort_order ?? "desc",
        }
      : {
          created_at: "desc",
        };
  const records = await MyGlobal.prisma.hrm_employee_invitations.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmEmployeeInvitationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_employee_invitations.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmEmployeeInvitationAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmEmployeeInvitation.ISummary;
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
// import { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
// import { IPageIHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployeeInvitation";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberInvitations(props: {
//   member: MemberPayload;
//   body: IHrmEmployeeInvitation.IRequest;
// }): Promise<IPageIHrmEmployeeInvitation.ISummary> {
//   const records = await MyGlobal.prisma.hrm_employee_invitations.findMany({
//     ...HrmEmployeeInvitationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmEmployeeInvitationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------