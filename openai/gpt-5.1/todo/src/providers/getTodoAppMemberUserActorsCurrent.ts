import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppActorCurrent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorCurrent";
import { IETodoAppActorKind } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppActorKind";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getTodoAppMemberUserActorsCurrent(props: {
  memberUser: MemberuserPayload;
}): Promise<ITodoAppActorCurrent> {
  // The MemberuserPayload has already been authenticated and validated
  // by the MemberuserAuth decorator and memberuserAuthorize provider.
  // We still need to ensure that the underlying member user record exists
  // and is active at the moment of this call, and then project it into
  // the unified ITodoAppActorCurrent representation.

  const member = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: props.memberUser.id,
      status: "active",
    },
  });

  if (member === null) {
    // The session was authenticated but the backing member user record
    // no longer exists or is not active, so treat this as an invalid
    // authentication context.
    throw new HttpException("Member user not found or inactive", 401);
  }

  const memberSummaryBase = {
    id: member.id,
    email: member.email,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
  };

  const memberSummary: ITodoAppMemberUser.ISummary =
    member.display_name === null
      ? memberSummaryBase
      : {
          ...memberSummaryBase,
          display_name: member.display_name,
        };

  const result: ITodoAppActorCurrent = {
    actorKind: "memberUser",
    adminUser: null,
    memberUser: memberSummary,
    guestUser: null,
  };

  return result;
}
