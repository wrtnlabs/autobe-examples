import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmOrganizationTransformer } from "../transformers/ErpHrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminOrganizationsOrganizationId(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmOrganization.IUpdate;
}): Promise<IErpHrmOrganization> {
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (organization.owner_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.erp_hrm_organizationsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.logo_uri !== undefined) {
    updateData.logo_uri = props.body.logo_uri;
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
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow(
    {
      where: { id: props.organizationId },
      ...ErpHrmOrganizationTransformer.select(),
    },
  );
  return await ErpHrmOrganizationTransformer.transform(updated);
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmAdminOrganizationsOrganizationId(props: {
//   admin: AdminPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IErpHrmOrganization.IUpdate;
// }): Promise<IErpHrmOrganization> {
//   await MyGlobal.prisma.erp_hrm_organizations.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmOrganizationTransformer.select(),
//   });
//   return await ErpHrmOrganizationTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------