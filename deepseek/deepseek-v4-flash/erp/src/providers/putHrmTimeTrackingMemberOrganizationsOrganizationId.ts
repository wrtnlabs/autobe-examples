import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganization.IUpdate;
}): Promise<IHrmTimeTrackingOrganization> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, hrm_time_tracking_member_id: true },
    });
  if (organization.hrm_time_tracking_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const duplicate =
      await MyGlobal.prisma.hrm_time_tracking_organizations.findFirst({
        where: {
          name: props.body.name,
          status: "active",
          id: { not: props.organizationId },
        },
        select: { id: true },
      });
    if (duplicate !== null) {
      throw new HttpException("Organization name already exists", 409);
    }
  }
  if (props.body.currency !== undefined) {
    if (!/^[A-Z]{3}$/.test(props.body.currency)) {
      throw new HttpException(
        "Invalid currency code. Must be a 3-letter ISO 4217 code (e.g., USD, EUR, KRW).",
        400,
      );
    }
  }
  if (props.body.timezone !== undefined) {
    const validTimezones: string[] = Intl.supportedValuesOf("timeZone");
    if (!validTimezones.includes(props.body.timezone)) {
      throw new HttpException(
        "Invalid timezone identifier. Must be a valid IANA timezone (e.g., America/New_York, Asia/Seoul).",
        400,
      );
    }
  }
  if (props.body.fiscal_start_month !== undefined) {
    if (
      !Number.isInteger(props.body.fiscal_start_month) ||
      props.body.fiscal_start_month < 1 ||
      props.body.fiscal_start_month > 12
    ) {
      throw new HttpException(
        "Fiscal start month must be an integer between 1 and 12.",
        400,
      );
    }
  }
  const updateData: Prisma.hrm_time_tracking_organizationsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.currency !== undefined) {
    updateData.currency = props.body.currency;
  }
  if (props.body.timezone !== undefined) {
    updateData.timezone = props.body.timezone;
  }
  if (props.body.fiscal_start_month !== undefined) {
    updateData.fiscal_start_month = props.body.fiscal_start_month;
  }
  await MyGlobal.prisma.hrm_time_tracking_organizations.update({
    where: { id: props.organizationId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmTimeTrackingOrganizationTransformer.select(),
    });
  return await HrmTimeTrackingOrganizationTransformer.transform(updated);
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
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingOrganization.IUpdate;
// }): Promise<IHrmTimeTrackingOrganization> {
//   await MyGlobal.prisma.hrm_time_tracking_organizations.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingOrganizationTransformer.select(),
//   });
//   return await HrmTimeTrackingOrganizationTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------