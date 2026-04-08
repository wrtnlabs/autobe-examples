import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmOrganizationOwnerTransformer } from "../transformers/HrmOrganizationOwnerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdOwnersOwnerId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  ownerId: string & tags.Format<"uuid">;
}): Promise<IHrmOrganizationOwner> {
  // Verify member belongs to the organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the owner record with organization relation to check soft delete
  const record = await MyGlobal.prisma.hrm_organization_owners.findFirstOrThrow(
    {
      ...HrmOrganizationOwnerTransformer.select(),
      where: {
        id: props.ownerId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
    },
  );
  return await HrmOrganizationOwnerTransformer.transform(record);
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
// import { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdOwnersOwnerId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   ownerId: string & tags.Format<"uuid">;
// }): Promise<IHrmOrganizationOwner> {
//   const record = await MyGlobal.prisma.hrm_organization_owners.findFirstOrThrow({
//     ...HrmOrganizationOwnerTransformer.select(),
//     where: { ... },
//   });
//   return await HrmOrganizationOwnerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------