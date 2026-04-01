import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeEmployeeInvitationCollector } from "../collectors/ErpHrmTimeEmployeeInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberEmployeesInvitations(props: {
  member: MemberPayload;
  body: IErpHrmTimeEmployeeInvitation.ICreate;
}): Promise<IErpHrmTimeEmployeeInvitation> {
  const existing = await MyGlobal.prisma.erp_hrm_time_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (existing !== null) {
    const response: IErpHrmTimeEmployeeInvitation = {
      id: true,
      email: existing.email,
      status: true,
      member: null,
      createdAt: true,
      updatedAt: true,
    };
    return response;
  }
  const now = new Date();
  const created = await MyGlobal.prisma.erp_hrm_time_members.create({
    data: {
      ...(await ErpHrmTimeEmployeeInvitationCollector.collect({
        body: props.body,
      })),
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });
  const response: IErpHrmTimeEmployeeInvitation = {
    id: true,
    email: created.email,
    status: false,
    member: null,
    createdAt: true,
    updatedAt: true,
  };
  return response;
}
