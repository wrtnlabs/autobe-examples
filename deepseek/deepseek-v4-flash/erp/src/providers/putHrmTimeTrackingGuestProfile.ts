import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmTimeTrackingMemberTransformer } from "../transformers/HrmTimeTrackingMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingGuestProfile(props: {
  guest: GuestPayload;
  body: IHrmTimeTrackingMember.IUpdate;
}): Promise<IHrmTimeTrackingMember> {
  if (!props.body.display_name || props.body.display_name.trim().length === 0) {
    throw new HttpException(
      "display_name is required and must be a non-empty string",
      400,
    );
  }
  const existing = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
    where: { id: props.guest.id, deleted_at: null },
    select: { id: true },
  });
  if (existing === null) {
    throw new HttpException("Member not found or has been deleted", 404);
  }
  await MyGlobal.prisma.hrm_time_tracking_members.update({
    where: { id: props.guest.id },
    data: {
      display_name: props.body.display_name,
      ...(props.body.avatar !== undefined && {
        avatar: props.body.avatar,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: props.guest.id },
      ...HrmTimeTrackingMemberTransformer.select(),
    });
  return await HrmTimeTrackingMemberTransformer.transform(updated);
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
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingGuestProfile(props: {
//   guest: GuestPayload;
//   body: IHrmTimeTrackingMember.IUpdate;
// }): Promise<IHrmTimeTrackingMember> {
//   await MyGlobal.prisma.hrm_time_tracking_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingMemberTransformer.select(),
//   });
//   return await HrmTimeTrackingMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------