import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmOrganizationTransformer } from "../transformers/HrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmOrganization.IUpdate;
}): Promise<IHrmOrganization> {
  const ownership = await MyGlobal.prisma.hrm_organization_owners.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      is_current: true,
      deleted_at: null,
    },
  });
  if (!ownership) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.hrm_organizations.update({
    where: { id: props.organizationId },
    data: {
      name: props.body.name,
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logo_image_url !== undefined && {
        logo_image_url: props.body.logo_image_url,
      }),
      ...(props.body.currency !== undefined && {
        currency: props.body.currency,
      }),
      ...(props.body.timezone !== undefined && {
        timezone: props.body.timezone,
      }),
      ...(props.body.fiscal_start_month !== undefined && {
        fiscal_start_month: props.body.fiscal_start_month,
      }),
    },
  });
  const updated = await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    ...HrmOrganizationTransformer.select(),
  });
  return await HrmOrganizationTransformer.transform(updated);
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
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberOrganizationsOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmOrganization.IUpdate;
// }): Promise<IHrmOrganization> {
//   await MyGlobal.prisma.hrm_organizations.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
//     where: { ... },
//     ...HrmOrganizationTransformer.select(),
//   });
//   return await HrmOrganizationTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------