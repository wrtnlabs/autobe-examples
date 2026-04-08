import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationTransformer } from "../transformers/HrmPlatformOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganization.IUpdate;
}): Promise<IHrmPlatformOrganization> {
  // Step 1: Verify organization exists and is not soft-deleted
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Step 2: Verify the member owns this organization
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate name uniqueness if provided
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.hrm_platform_organizations.findFirst(
      {
        where: {
          owner_id: props.member.id,
          name: props.body.name,
          id: {
            not: props.organizationId,
          },
          deleted_at: null,
        },
      },
    );
    if (existing !== null) {
      throw new HttpException("Organization name already exists", 400);
    }
  }
  // Step 4: Validate fiscal_start_month range if provided
  if (props.body.fiscal_start_month !== undefined) {
    const fiscalMonth = props.body.fiscal_start_month;
    if (fiscalMonth < 1 || fiscalMonth > 12) {
      throw new HttpException(
        "fiscal_start_month must be between 1 and 12",
        400,
      );
    }
  }
  // Step 5-6: Build update data with provided fields and current timestamp
  const updateData: Prisma.hrm_platform_organizationsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.currency !== undefined && { currency: props.body.currency }),
    ...(props.body.timezone !== undefined && { timezone: props.body.timezone }),
    ...(props.body.fiscal_start_month !== undefined && {
      fiscal_start_month: props.body.fiscal_start_month,
    }),
  };
  // Step 6: Update organization
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: { id: props.organizationId },
    data: updateData,
  });
  // Step 7: Return complete updated organization
  const updated =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmPlatformOrganizationTransformer.select(),
    });
  return await HrmPlatformOrganizationTransformer.transform(updated);
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
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberOrganizationsOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmPlatformOrganization.IUpdate;
// }): Promise<IHrmPlatformOrganization> {
//   await MyGlobal.prisma.hrm_platform_organizations.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformOrganizationTransformer.select(),
//   });
//   return await HrmPlatformOrganizationTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------