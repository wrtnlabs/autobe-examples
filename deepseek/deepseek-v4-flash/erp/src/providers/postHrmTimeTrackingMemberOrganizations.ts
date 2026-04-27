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
import { HrmTimeTrackingOrganizationCollector } from "../collectors/HrmTimeTrackingOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingOrganization.ICreate;
}): Promise<IHrmTimeTrackingOrganization> {
  // Validate currency against supported ISO 4217 codes
  const supportedCurrencies = new Set(["USD", "EUR", "KRW", "JPY", "GBP"]);
  if (supportedCurrencies.has(props.body.currency) === false) {
    throw new HttpException(
      `Unsupported currency: "${props.body.currency}". Accepted values are: ${Array.from(supportedCurrencies).join(", ")}.`,
      400,
    );
  }
  // Validate timezone against IANA timezone database
  try {
    Intl.DateTimeFormat("en-US", { timeZone: props.body.timezone });
  } catch {
    throw new HttpException(
      `Unsupported timezone: "${props.body.timezone}". Accepted values are IANA timezone identifiers (e.g., America/New_York, Asia/Seoul, Europe/London).`,
      400,
    );
  }
  // Create the organization
  try {
    const record = await MyGlobal.prisma.hrm_time_tracking_organizations.create(
      {
        data: await HrmTimeTrackingOrganizationCollector.collect({
          body: props.body,
          hrmTimeTrackingMembers: { id: props.member.id },
          hrmTimeTrackingMemberSessions: { id: props.member.session_id },
        }),
        ...HrmTimeTrackingOrganizationTransformer.select(),
      },
    );
    return await HrmTimeTrackingOrganizationTransformer.transform(record);
  } catch (error) {
    // Handle Prisma unique constraint violation for duplicate organization name
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        `An organization with the name "${props.body.name}" already exists. Please choose a different name.`,
        409,
      );
    }
    throw error;
  }
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
// export async function postHrmTimeTrackingMemberOrganizations(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingOrganization.ICreate;
// }): Promise<IHrmTimeTrackingOrganization> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_organizations.create({
//     data: await HrmTimeTrackingOrganizationCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingOrganizationTransformer.select(),
//   });
//   return await HrmTimeTrackingOrganizationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------